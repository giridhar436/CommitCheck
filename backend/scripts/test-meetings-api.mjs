/**
 * End-to-end Meetings API tests (dev-only): ephemeral PostgreSQL + compiled
 * Nest app; covers list/pagination/search/date+status filters/sorting, detail,
 * CRUD, validation, duplicate titles (allowed), not-found paths, activity logs.
 * Usage: node scripts/test-meetings-api.mjs
 */
import EmbeddedPostgres from 'embedded-postgres';
import { signToken, TEST_JWT_SECRET, USER_A } from './lib/auth-helper.mjs';
import { spawn, execSync } from 'node:child_process';

const PG_PORT = 5433;
const API_PORT = 3100;
const BASE = `http://localhost:${API_PORT}/api`;
const DB = 'commitcheck';

const env = {
  ...process.env,
  DATABASE_URL: `postgresql://postgres:postgres@localhost:${PG_PORT}/${DB}`,
  DIRECT_URL: `postgresql://postgres:postgres@localhost:${PG_PORT}/${DB}`,
  PORT: String(API_PORT),
  SUPABASE_JWT_SECRET: TEST_JWT_SECRET,
};

// Phase 15: every request in this suite authenticates as USER_A (the seeded owner).
const token = await signToken(USER_A);

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? '✅' : '❌'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
}

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${token}`,
      },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function waitReady() {
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(`${BASE}/projects`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error('API never became ready');
}

const NOVA_ID = 'a1111111-1111-4111-8111-111111111111';
const CART_ID = 'a2222222-2222-4222-8222-222222222222';
const RANDOM_ID = '00000000-0000-4000-8000-000000000000';
const meetings = (projectId) => `/projects/${projectId}/meetings`;

let api;
const pg = new EmbeddedPostgres({
  databaseDir: './.verify-pg-data',
  user: 'postgres',
  password: 'postgres',
  port: PG_PORT,
  persistent: false,
});

try {
  console.log('Starting ephemeral PostgreSQL + API…');
  await pg.initialise();
  await pg.start();
  await pg.createDatabase(DB);
  execSync('npx prisma migrate deploy', { env, stdio: 'inherit' });
  execSync('npm run db:seed', { env, stdio: 'inherit' });

  api = spawn('node', ['dist/main.js'], { env, stdio: 'pipe' });
  api.stderr.on('data', (d) => process.stderr.write(d));
  await waitReady();

  console.log('\n——— GET /projects/:projectId/meetings ———');
  let r = await req('GET', meetings(NOVA_ID));
  check('list → 200 envelope, 3 seeded meetings', r.status === 200 && r.json.success === true && r.json.data.totalItems === 3 && r.json.data.items.length === 3, JSON.stringify(r.json.data));
  const first = r.json.data.items[0];
  check('list items carry counts + latestActivity', typeof first.commitmentCount === 'number' && typeof first.attachmentCount === 'number' && 'latestActivity' in first, JSON.stringify(first));

  r = await req('GET', meetings(NOVA_ID) + '?page=2&limit=2');
  check('pagination page=2&limit=2 → 1 item, 2 pages', r.status === 200 && r.json.data.items.length === 1 && r.json.data.totalPages === 2 && r.json.data.page === 2);
  r = await req('GET', meetings(NOVA_ID) + '?limit=200');
  check('limit=200 rejected (400)', r.status === 400);

  // ——— status filter ———
  r = await req('GET', meetings(NOVA_ID) + '?analysisStatus=PROCESSING');
  check('analysisStatus=PROCESSING → 1', r.status === 200 && r.json.data.totalItems === 1 && r.json.data.items[0].analysisStatus === 'PROCESSING');
  r = await req('GET', meetings(NOVA_ID) + '?analysisStatus=COMPLETED');
  check('analysisStatus=COMPLETED → 2', r.status === 200 && r.json.data.totalItems === 2);
  r = await req('GET', meetings(NOVA_ID) + '?analysisStatus=BOGUS');
  check('analysisStatus=BOGUS rejected (400)', r.status === 400);

  // ——— date range filter ———
  r = await req('GET', meetings(NOVA_ID) + '?meetingDateFrom=2026-09-01');
  check('meetingDateFrom=2026-09-01 → 2', r.status === 200 && r.json.data.totalItems === 2);
  r = await req('GET', meetings(NOVA_ID) + '?meetingDateFrom=2026-09-01&meetingDateTo=2026-09-30');
  check('date range Sep 2026 → 1 (Sprint 4)', r.status === 200 && r.json.data.totalItems === 1 && r.json.data.items[0].title.startsWith('Sprint 4'));
  r = await req('GET', meetings(NOVA_ID) + '?meetingDateFrom=2027-01-01');
  check('future range → empty', r.status === 200 && r.json.data.totalItems === 0);
  r = await req('GET', meetings(NOVA_ID) + '?meetingDateFrom=not-a-date');
  check('invalid meetingDateFrom → 400', r.status === 400);

  // ——— search (title + summary) ———
  r = await req('GET', meetings(NOVA_ID) + '?search=freezing');
  check('search title "freezing" → 1', r.status === 200 && r.json.data.totalItems === 1);
  r = await req('GET', meetings(NOVA_ID) + '?search=demoed');
  check('search summary "demoed" → 1', r.status === 200 && r.json.data.totalItems === 1 && r.json.data.items[0].title.startsWith('Sprint 4'));
  r = await req('GET', meetings(NOVA_ID) + '?search=zzz');
  check('search no match → empty', r.status === 200 && r.json.data.totalItems === 0);

  // ——— sorting ———
  r = await req('GET', meetings(NOVA_ID) + '?sortBy=title&sortOrder=asc');
  check('sort by title asc → Ad-hoc first', r.status === 200 && r.json.data.items[0].title.startsWith('Ad-hoc'));
  r = await req('GET', meetings(NOVA_ID) + '?sortBy=meetingDate&sortOrder=desc');
  check('sort by meetingDate desc → most recent first', r.status === 200 && r.json.data.items[0].meetingDate.startsWith('2026-10-09'));
  r = await req('GET', meetings(NOVA_ID) + '?sortBy=summary');
  check('sortBy=summary rejected (400)', r.status === 400);
  r = await req('GET', meetings(NOVA_ID) + '?sortBy=id');
  check('sortBy=id rejected (400)', r.status === 400);

  // ——— guards ———
  r = await req('GET', meetings(RANDOM_ID));
  check('project not found → 404', r.status === 404 && r.json.message.includes('Project with id'));
  r = await req('GET', '/projects/not-a-uuid/meetings');
  check('invalid project uuid → 400', r.status === 400);

  console.log('\n——— GET /projects/:projectId/meetings/:id ———');
  const list = (await req('GET', meetings(NOVA_ID))).json.data.items;
  const sprint4 = list.find((m) => m.title.startsWith('Sprint 4'));
  r = await req('GET', meetings(NOVA_ID) + `/${sprint4.id}`);
  const detail = r.json.data;
  check('detail → 200 with counts', r.status === 200 && detail.commitmentCount === 3 && detail.attachmentCount === 2, JSON.stringify(detail?.counts ?? detail));
  check('detail attachments array present', Array.isArray(detail.attachments) && detail.attachments.length === 2 && typeof detail.attachments[0].fileName === 'string');
  check('detail latestActivity = MEETING_ANALYZED', detail.latestActivity?.action === 'MEETING_ANALYZED', JSON.stringify(detail.latestActivity));

  r = await req('GET', meetings(CART_ID) + `/${sprint4.id}`);
  check('meeting under wrong project → 404', r.status === 404);
  r = await req('GET', meetings(NOVA_ID) + `/${RANDOM_ID}`);
  check('unknown meeting → 404', r.status === 404);
  r = await req('GET', meetings(NOVA_ID) + '/not-a-uuid');
  check('invalid meeting uuid → 400', r.status === 400);

  console.log('\n——— POST /projects/:projectId/meetings ———');
  r = await req('GET', `/projects/${NOVA_ID}`);
  const meetingsBefore = r.json.data.counts.meetings;
  const payload = { title: 'Quarterly Business Review', summary: 'QBR with the client steering committee.', meetingDate: '2026-10-20T14:00:00Z' };
  r = await req('POST', meetings(NOVA_ID), payload);
  check('POST valid → 201, analysisStatus NOT_STARTED default', r.status === 201 && r.json.success === true && r.json.data.analysisStatus === 'NOT_STARTED' && r.json.data.commitmentCount === 0, JSON.stringify(r.json));
  const createdId = r.json?.data?.id;

  r = await req('GET', `/projects/${NOVA_ID}`);
  check('project counts.meetings incremented', r.json.data.counts.meetings === meetingsBefore + 1);
  check('PROJECT detail logs MEETING_CREATED', r.json.data.latestActivity?.action === 'MEETING_CREATED', JSON.stringify(r.json.data.latestActivity));

  r = await req('POST', meetings(NOVA_ID), { ...payload, analysisStatus: 'COMPLETED' });
  check('explicit analysisStatus honored', r.status === 201 && r.json.data.analysisStatus === 'COMPLETED');
  const dupId = r.json?.data?.id;

  r = await req('POST', meetings(NOVA_ID), { ...payload, title: 'quarterly business review' });
  check('duplicate title allowed → 201', r.status === 201);

  r = await req('POST', meetings(NOVA_ID), { summary: 'no title', meetingDate: '2026-10-20' });
  check('missing title → 400', r.status === 400);
  r = await req('POST', meetings(NOVA_ID), { title: '   ', meetingDate: '2026-10-20' });
  check('empty title → 400', r.status === 400);
  r = await req('POST', meetings(NOVA_ID), { title: 'X' });
  check('missing meetingDate → 400', r.status === 400);
  r = await req('POST', meetings(NOVA_ID), { title: 'X', meetingDate: 'not-a-date' });
  check('invalid meetingDate → 400', r.status === 400);
  r = await req('POST', meetings(NOVA_ID), { title: 'X', meetingDate: '2026-10-20', analysisStatus: 'DONE' });
  check('invalid analysisStatus → 400', r.status === 400);
  r = await req('POST', meetings(NOVA_ID), { title: 'X', meetingDate: '2026-10-20', summary: 'y'.repeat(5001) });
  check('summary > 5000 chars → 400', r.status === 400);
  r = await req('POST', meetings(NOVA_ID), { title: 'X', meetingDate: '2026-10-20', hacker: true });
  check('unknown property → 400', r.status === 400);
  r = await req('POST', meetings(RANDOM_ID), { title: 'X', meetingDate: '2026-10-20' });
  check('POST to missing project → 404', r.status === 404);

  console.log('\n——— PATCH /projects/:projectId/meetings/:id ———');
  r = await req('PATCH', meetings(NOVA_ID) + `/${createdId}`, { title: 'QBR — October', summary: 'Rescheduled quarterly review.' });
  check('PATCH valid → 200 + updated fields', r.status === 200 && r.json.data.title === 'QBR — October' && r.json.data.summary === 'Rescheduled quarterly review.');
  r = await req('GET', `/projects/${NOVA_ID}`);
  check('PATCH logs MEETING_UPDATED', r.json.data.latestActivity?.action === 'MEETING_UPDATED', JSON.stringify(r.json.data.latestActivity));

  r = await req('PATCH', meetings(NOVA_ID) + `/${createdId}`, { analysisStatus: 'FAILED' });
  check('PATCH analysisStatus → FAILED', r.status === 200 && r.json.data.analysisStatus === 'FAILED');
  r = await req('PATCH', meetings(NOVA_ID) + `/${createdId}`, { meetingDate: 'tomorrow' });
  check('PATCH invalid meetingDate → 400', r.status === 400);
  r = await req('PATCH', meetings(NOVA_ID) + `/${createdId}`, { bogus: 1 });
  check('PATCH unknown property → 400', r.status === 400);
  r = await req('PATCH', meetings(NOVA_ID) + `/${RANDOM_ID}`, { title: 'Ghost' });
  check('PATCH unknown meeting → 404', r.status === 404);

  console.log('\n——— DELETE /projects/:projectId/meetings/:id ———');
  r = await req('DELETE', meetings(NOVA_ID) + `/${createdId}`);
  check('DELETE → 200 envelope', r.status === 200 && r.json.success === true && r.json.data.id === createdId);
  r = await req('GET', meetings(NOVA_ID) + `/${createdId}`);
  check('deleted meeting → 404', r.status === 404);
  r = await req('GET', `/projects/${NOVA_ID}`);
  check('net +2 (duplicate-title rows remain) + MEETING_DELETED logged', r.json.data.counts.meetings === meetingsBefore + 2 && r.json.data.latestActivity?.action === 'MEETING_DELETED', JSON.stringify(r.json.data.latestActivity));
  r = await req('DELETE', meetings(NOVA_ID) + `/${createdId}`);
  check('DELETE again → 404', r.status === 404);

  // cleanup extra rows created above
  await req('DELETE', meetings(NOVA_ID) + `/${dupId}`);

  console.log(`\n${results.filter((x) => x.ok).length}/${results.length} checks passed`);
  if (results.some((x) => !x.ok)) process.exitCode = 1;
} catch (err) {
  console.error('❌ Test run failed:', err);
  process.exitCode = 1;
} finally {
  api?.kill();
  try {
    await pg.stop();
  } catch {
    /* already stopped */
  }
  console.log('Ephemeral PostgreSQL stopped.');
}

// Force-exit: an embedded-postgres child handle can outlive the suite on
// Windows and block a clean exit after the summary has printed.
process.exit(process.exitCode || 0);
