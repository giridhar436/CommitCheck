/**
 * End-to-end Commitments API tests (dev-only): ephemeral PostgreSQL + compiled
 * Nest app; covers project-scoped CRUD, meeting-scoped read surface, search,
 * filters, sorting, ownership rules, validation (confidence bounds, enums),
 * duplicate titles (allowed), activity logs, and rollback integrity.
 * Usage: node scripts/test-commitments-api.mjs
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
const commitments = (projectId) => `/projects/${projectId}/commitments`;
const meetingCommitments = (meetingId) => `/meetings/${meetingId}/commitments`;

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

  const novaMeetings = (await req('GET', `/projects/${NOVA_ID}/meetings`)).json.data.items;
  const sprint4 = novaMeetings.find((m) => m.title.startsWith('Sprint 4'));
  const kickoff = novaMeetings.find((m) => m.title.startsWith('Project Kickoff'));
  const cartMeetings = (await req('GET', `/projects/${CART_ID}/meetings`)).json.data.items;
  const cartMeeting = cartMeetings[0];

  console.log('\n——— GET /projects/:projectId/commitments ———');
  let r = await req('GET', commitments(NOVA_ID));
  check('list → 200 envelope, 4 seeded commitments', r.status === 200 && r.json.success === true && r.json.data.totalItems === 4, JSON.stringify(r.json.data));
  const first = r.json.data.items[0];
  check('list items carry meetingTitle + latestActivity', typeof first.meetingTitle === 'string' && 'latestActivity' in first && 'confidenceScore' in first, JSON.stringify(first));

  r = await req('GET', commitments(NOVA_ID) + '?page=2&limit=2');
  check('pagination page=2&limit=2 → 2 items, 2 pages', r.status === 200 && r.json.data.items.length === 2 && r.json.data.totalPages === 2 && r.json.data.page === 2);
  r = await req('GET', commitments(NOVA_ID) + '?limit=200');
  check('limit=200 rejected (400)', r.status === 400);

  console.log('\n——— search ———');
  r = await req('GET', commitments(NOVA_ID) + '?search=google');
  check('search title "google" → 1', r.status === 200 && r.json.data.totalItems === 1 && r.json.data.items[0].title.includes('Google'));
  r = await req('GET', commitments(NOVA_ID) + '?search=custom date ranges');
  check('search description → 1', r.status === 200 && r.json.data.totalItems === 1 && r.json.data.items[0].title.includes('CSV export'));
  r = await req('GET', commitments(NOVA_ID) + '?search=miguel');
  check('search speaker "miguel" → 1', r.status === 200 && r.json.data.totalItems === 1 && r.json.data.items[0].speaker.includes('Miguel'));
  r = await req('GET', commitments(NOVA_ID) + '?search=zzz');
  check('search no match → empty', r.status === 200 && r.json.data.totalItems === 0);

  console.log('\n——— filters ———');
  r = await req('GET', commitments(NOVA_ID) + '?authorizationStatus=UNAUTHORIZED');
  check('authorizationStatus=UNAUTHORIZED → 2', r.status === 200 && r.json.data.totalItems === 2);
  r = await req('GET', commitments(NOVA_ID) + '?riskLevel=HIGH');
  check('riskLevel=HIGH → 1', r.status === 200 && r.json.data.totalItems === 1 && r.json.data.items[0].title.includes('Google Login'));
  r = await req('GET', commitments(NOVA_ID) + `?speaker=${encodeURIComponent('dana (team lead)')}`);
  check('speaker filter (case-insensitive) → 3', r.status === 200 && r.json.data.totalItems === 3);
  r = await req('GET', commitments(NOVA_ID) + `?meetingId=${kickoff.id}`);
  check('meetingId filter → 1', r.status === 200 && r.json.data.totalItems === 1 && r.json.data.items[0].meetingId === kickoff.id);
  r = await req('GET', commitments(NOVA_ID) + '?riskLevel=HIGH&authorizationStatus=UNAUTHORIZED');
  check('combined filters → 1', r.status === 200 && r.json.data.totalItems === 1);
  r = await req('GET', commitments(NOVA_ID) + '?riskLevel=EXTREME');
  check('invalid riskLevel filter → 400', r.status === 400);

  console.log('\n——— sorting ———');
  r = await req('GET', commitments(NOVA_ID) + '?sortBy=confidenceScore&sortOrder=desc');
  check('sort by confidenceScore desc → 0.99 first', r.status === 200 && r.json.data.items[0].confidenceScore === 0.99);
  r = await req('GET', commitments(NOVA_ID) + '?sortBy=riskLevel&sortOrder=desc');
  check('sort by riskLevel desc → HIGH first', r.status === 200 && r.json.data.items[0].riskLevel === 'HIGH');
  r = await req('GET', commitments(NOVA_ID) + '?sortBy=title&sortOrder=asc');
  check('sort by title asc → "Add Google Login" first', r.status === 200 && r.json.data.items[0].title.startsWith('Add Google'));
  r = await req('GET', commitments(NOVA_ID) + '?sortBy=speaker');
  check('sortBy=speaker rejected (400)', r.status === 400);
  r = await req('GET', commitments(NOVA_ID) + '?sortBy=id');
  check('sortBy=id rejected (400)', r.status === 400);

  console.log('\n——— guards ———');
  r = await req('GET', commitments(RANDOM_ID));
  check('project not found → 404', r.status === 404 && r.json.message.includes('Project with id'));
  r = await req('GET', '/projects/not-a-uuid/commitments');
  check('invalid project uuid → 400', r.status === 400);

  console.log('\n——— GET /projects/:projectId/commitments/:id ———');
  const google = (await req('GET', commitments(NOVA_ID) + '?search=google')).json.data.items[0];
  r = await req('GET', commitments(NOVA_ID) + `/${google.id}`);
  const detail = r.json.data;
  check('detail → 200 with meeting/project context', r.status === 200 && detail.meetingTitle === 'Sprint 4 Review — Client Sync' && detail.projectName === 'NovaBank Mobile App' && typeof detail.meetingSummary === 'string' && typeof detail.projectSummary === 'string', JSON.stringify(detail));
  check('detail evidenceCount=2, description present', detail.evidenceCount === 2 && detail.description.length > 0);
  check('detail latestActivity = COMMITMENT_FLAGGED', detail.latestActivity?.action === 'COMMITMENT_FLAGGED', JSON.stringify(detail.latestActivity));

  r = await req('GET', commitments(CART_ID) + `/${google.id}`);
  check('commitment under wrong project → 404', r.status === 404);
  r = await req('GET', commitments(NOVA_ID) + `/${RANDOM_ID}`);
  check('unknown commitment → 404', r.status === 404);
  r = await req('GET', commitments(NOVA_ID) + '/not-a-uuid');
  check('invalid commitment uuid → 400', r.status === 400);

  console.log('\n——— GET /meetings/:meetingId/commitments ———');
  r = await req('GET', meetingCommitments(sprint4.id));
  check('meeting-scoped list → 3 for Sprint 4', r.status === 200 && r.json.data.totalItems === 3 && r.json.data.items.every((c) => c.meetingId === sprint4.id));
  check('meeting-scoped items carry correct meetingTitle', r.json.data.items.every((c) => c.meetingTitle === 'Sprint 4 Review — Client Sync'));
  r = await req('GET', meetingCommitments(sprint4.id) + '?authorizationStatus=UNAUTHORIZED');
  check('meeting-scoped filter works', r.status === 200 && r.json.data.totalItems === 2);
  r = await req('GET', meetingCommitments(RANDOM_ID));
  check('unknown meeting → 404', r.status === 404 && r.json.message.includes('Meeting with id'));
  r = await req('GET', '/meetings/not-a-uuid/commitments');
  check('invalid meeting uuid → 400', r.status === 400);

  console.log('\n——— POST ———');
  r = await req('GET', commitments(NOVA_ID));
  const before = r.json.data.totalItems;
  const payload = { title: 'Ship dark mode', description: 'Team agreed to add a dark theme to the mobile app.', speaker: 'Dana (Team Lead)', meetingId: sprint4.id, confidenceScore: 0.9, riskLevel: 'MEDIUM' };
  r = await req('POST', commitments(NOVA_ID), payload);
  check('POST valid → 201, PENDING default, meetingTitle attached', r.status === 201 && r.json.success === true && r.json.data.authorizationStatus === 'PENDING' && r.json.data.riskLevel === 'MEDIUM' && r.json.data.meetingTitle === 'Sprint 4 Review — Client Sync', JSON.stringify(r.json));
  const createdId = r.json?.data?.id;
  r = await req('GET', commitments(NOVA_ID) + `/${createdId}`);
  check('detail logs COMMITMENT_CREATED', r.json.data.latestActivity?.action === 'COMMITMENT_CREATED', JSON.stringify(r.json.data.latestActivity));

  r = await req('POST', commitments(NOVA_ID), payload);
  check('duplicate title allowed → 201', r.status === 201);
  const dupId = r.json?.data?.id;

  r = await req('POST', commitments(NOVA_ID), { ...payload, meetingId: cartMeeting.id });
  check('meeting from ANOTHER project → 400', r.status === 400 && r.json.message.includes('does not belong'), JSON.stringify(r.json));
  r = await req('GET', commitments(NOVA_ID));
  check('rejected create left count unchanged (transaction integrity)', r.json.data.totalItems === before + 2);
  r = await req('POST', commitments(NOVA_ID), { ...payload, meetingId: RANDOM_ID });
  check('missing meeting → 404', r.status === 404);
  r = await req('POST', commitments(RANDOM_ID), payload);
  check('missing project → 404', r.status === 404);

  r = await req('POST', commitments(NOVA_ID), { description: 'd', speaker: 's', meetingId: sprint4.id });
  check('missing title → 400', r.status === 400);
  r = await req('POST', commitments(NOVA_ID), { title: '  ', description: 'd', speaker: 's', meetingId: sprint4.id });
  check('blank title → 400', r.status === 400);
  r = await req('POST', commitments(NOVA_ID), { title: 'T', speaker: 's', meetingId: sprint4.id });
  check('missing description → 400', r.status === 400);
  r = await req('POST', commitments(NOVA_ID), { title: 'T', description: 'd', meetingId: sprint4.id });
  check('missing speaker → 400', r.status === 400);
  r = await req('POST', commitments(NOVA_ID), { ...payload, confidenceScore: -0.1 });
  check('confidenceScore < 0 → 400', r.status === 400);
  r = await req('POST', commitments(NOVA_ID), { ...payload, confidenceScore: 1.1 });
  check('confidenceScore > 1 → 400', r.status === 400);
  r = await req('POST', commitments(NOVA_ID), { ...payload, riskLevel: 'EXTREME' });
  check('invalid riskLevel → 400', r.status === 400);
  r = await req('POST', commitments(NOVA_ID), { ...payload, authorizationStatus: 'MAYBE' });
  check('invalid authorizationStatus → 400', r.status === 400);
  r = await req('POST', commitments(NOVA_ID), { ...payload, evidenceReference: 'x'.repeat(501) });
  check('evidenceReference > 500 → 400', r.status === 400);
  r = await req('POST', commitments(NOVA_ID), { ...payload, meetingId: 'not-a-uuid' });
  check('invalid meetingId uuid → 400', r.status === 400);
  r = await req('POST', commitments(NOVA_ID), { ...payload, hacker: true });
  check('unknown property → 400', r.status === 400);

  console.log('\n——— PATCH ———');
  // Phase 11 security: clients can no longer write authorizationStatus —
  // only an approved Change Request (or Phase 10 verification) authorizes.
  r = await req('PATCH', commitments(NOVA_ID) + `/${createdId}`, { authorizationStatus: 'AUTHORIZED' });
  check('PATCH authorizationStatus → 400 (no direct authorization)', r.status === 400);
  r = await req('PATCH', commitments(NOVA_ID) + `/${createdId}`, { title: 'Ship dark mode v2' });
  check('PATCH valid → 200 + title updated, authorization untouched', r.status === 200 && r.json.data.title === 'Ship dark mode v2' && r.json.data.authorizationStatus === 'PENDING');
  r = await req('GET', commitments(NOVA_ID) + `/${createdId}`);
  check('PATCH logs COMMITMENT_UPDATED', r.json.data.latestActivity?.action === 'COMMITMENT_UPDATED', JSON.stringify(r.json.data.latestActivity));

  r = await req('PATCH', commitments(NOVA_ID) + `/${createdId}`, { meetingId: kickoff.id });
  check('PATCH meetingId re-verified → 200 + new meetingTitle', r.status === 200 && r.json.data.meetingId === kickoff.id && r.json.data.meetingTitle === 'Project Kickoff & Scope Walkthrough');
  r = await req('PATCH', commitments(NOVA_ID) + `/${createdId}`, { meetingId: cartMeeting.id });
  check('PATCH meetingId to wrong project → 400', r.status === 400 && r.json.message.includes('does not belong'));
  r = await req('PATCH', commitments(NOVA_ID) + `/${createdId}`, { confidenceScore: 1.5 });
  check('PATCH confidenceScore > 1 → 400', r.status === 400);
  r = await req('PATCH', commitments(NOVA_ID) + `/${createdId}`, { bogus: 1 });
  check('PATCH unknown property → 400', r.status === 400);
  r = await req('PATCH', commitments(NOVA_ID) + `/${RANDOM_ID}`, { title: 'Ghost' });
  check('PATCH unknown commitment → 404', r.status === 404);

  console.log('\n——— DELETE ———');
  r = await req('DELETE', commitments(NOVA_ID) + `/${createdId}`);
  check('DELETE → 200 envelope', r.status === 200 && r.json.success === true && r.json.data.id === createdId);
  r = await req('GET', commitments(NOVA_ID) + `/${createdId}`);
  check('deleted commitment → 404', r.status === 404);
  r = await req('GET', `/projects/${NOVA_ID}`);
  check('project audit trail logs COMMITMENT_DELETED', r.json.data.latestActivity?.action === 'COMMITMENT_DELETED', JSON.stringify(r.json.data.latestActivity));
  r = await req('DELETE', commitments(NOVA_ID) + `/${createdId}`);
  check('DELETE again → 404', r.status === 404);

  // cleanup extra row created above
  await req('DELETE', commitments(NOVA_ID) + `/${dupId}`);

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
