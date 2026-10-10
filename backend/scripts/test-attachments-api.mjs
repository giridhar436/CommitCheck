/**
 * End-to-end Meeting Attachments API tests (dev-only): ephemeral PostgreSQL +
 * compiled Nest app; covers list/pagination/search/sorting, detail, CRUD,
 * validation (MIME, storagePath, sizes), duplicate filenames (allowed),
 * wrong-project/meeting/attachment paths, uploadedAt defaulting, activity logs.
 * Usage: node scripts/test-attachments-api.mjs
 */
import EmbeddedPostgres from 'embedded-postgres';
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
};

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? '✅' : '❌'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
}

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
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
const attachments = (projectId, meetingId) =>
  `/projects/${projectId}/meetings/${meetingId}/attachments`;

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

  // Seeded meetings: NovaBank → Sprint 4 (2 attachments), Kickoff (1), Ad-hoc (1)
  const novaMeetings = (await req('GET', `/projects/${NOVA_ID}/meetings`)).json.data.items;
  const sprint4 = novaMeetings.find((m) => m.title.startsWith('Sprint 4'));
  const kickoff = novaMeetings.find((m) => m.title.startsWith('Project Kickoff'));
  const cartMeetings = (await req('GET', `/projects/${CART_ID}/meetings`)).json.data.items;
  const cartMeeting = cartMeetings[0];

  console.log('\n——— GET list ———');
  let r = await req('GET', attachments(NOVA_ID, sprint4.id));
  check('list → 200 envelope, 2 seeded attachments', r.status === 200 && r.json.success === true && r.json.data.totalItems === 2, JSON.stringify(r.json.data));
  const first = r.json.data.items[0];
  check('items carry full contract', typeof first.fileSize === 'number' && typeof first.storagePath === 'string' && 'latestActivity' in first, JSON.stringify(first));

  r = await req('GET', attachments(NOVA_ID, sprint4.id) + '?page=2&limit=1');
  check('pagination page=2&limit=1 → 1 item, 2 pages', r.status === 200 && r.json.data.items.length === 1 && r.json.data.totalPages === 2 && r.json.data.page === 2);
  r = await req('GET', attachments(NOVA_ID, sprint4.id) + '?limit=200');
  check('limit=200 rejected (400)', r.status === 400);

  r = await req('GET', attachments(NOVA_ID, sprint4.id) + '?search=transcript');
  check('search fileName "transcript" → 1 in Sprint 4', r.status === 200 && r.json.data.totalItems === 1);
  r = await req('GET', attachments(NOVA_ID, kickoff.id) + '?search=transcript');
  check('search in Kickoff meeting → 1', r.status === 200 && r.json.data.totalItems === 1);
  r = await req('GET', attachments(NOVA_ID, sprint4.id) + '?search=zzz');
  check('search no match → empty', r.status === 200 && r.json.data.totalItems === 0);

  r = await req('GET', attachments(NOVA_ID, sprint4.id) + '?sortBy=fileName&sortOrder=asc');
  check('sort by fileName asc → notes first', r.status === 200 && r.json.data.items[0].fileName === 'sprint4-notes.md');
  r = await req('GET', attachments(NOVA_ID, sprint4.id) + '?sortBy=uploadedAt');
  check('sortBy=uploadedAt allowed', r.status === 200 && r.json.data.totalItems === 2);
  r = await req('GET', attachments(NOVA_ID, sprint4.id) + '?sortBy=summary');
  check('sortBy=summary rejected (400)', r.status === 400);
  r = await req('GET', attachments(NOVA_ID, sprint4.id) + '?sortBy=id');
  check('sortBy=id rejected (400)', r.status === 400);

  console.log('\n——— guards ———');
  r = await req('GET', attachments(RANDOM_ID, sprint4.id));
  check('project not found → 404', r.status === 404 && r.json.message.includes('Project with id'));
  r = await req('GET', attachments(NOVA_ID, RANDOM_ID));
  check('meeting not found → 404', r.status === 404 && r.json.message.includes('Meeting with id'));
  r = await req('GET', attachments(CART_ID, sprint4.id));
  check('meeting under wrong project → 404', r.status === 404 && r.json.message.includes('Meeting with id'));
  r = await req('GET', '/projects/not-a-uuid/meetings/' + sprint4.id + '/attachments');
  check('invalid project uuid → 400', r.status === 400);
  r = await req('GET', attachments(NOVA_ID, 'not-a-uuid'));
  check('invalid meeting uuid → 400', r.status === 400);

  console.log('\n——— GET detail ———');
  const sprint4List = (await req('GET', attachments(NOVA_ID, sprint4.id))).json.data.items;
  const transcript = sprint4List.find((a) => a.fileName.includes('transcript'));
  r = await req('GET', attachments(NOVA_ID, sprint4.id) + `/${transcript.id}`);
  check('detail → 200 full metadata', r.status === 200 && r.json.data.id === transcript.id && r.json.data.meetingId === sprint4.id && r.json.data.fileType === 'text/plain');
  r = await req('GET', attachments(NOVA_ID, kickoff.id) + `/${transcript.id}`);
  check('attachment under wrong meeting → 404', r.status === 404 && r.json.message.includes('Attachment with id'));
  r = await req('GET', attachments(NOVA_ID, sprint4.id) + `/${RANDOM_ID}`);
  check('unknown attachment → 404', r.status === 404);
  r = await req('GET', attachments(NOVA_ID, sprint4.id) + '/not-a-uuid');
  check('invalid attachment uuid → 400', r.status === 400);

  console.log('\n——— POST ———');
  const valid = { fileName: 'qbr-notes.pdf', fileType: 'application/pdf', storagePath: `meetings/${NOVA_ID}/${sprint4.id}/qbr-notes.pdf`, fileSize: 20480 };
  r = await req('POST', attachments(NOVA_ID, sprint4.id), valid);
  check('POST valid → 201', r.status === 201 && r.json.success === true && r.json.data.fileName === 'qbr-notes.pdf', JSON.stringify(r.json));
  const createdId = r.json?.data?.id;
  const createdUploadedAt = r.json?.data?.uploadedAt;
  check('uploadedAt defaults to now()', Math.abs(Date.now() - new Date(createdUploadedAt).getTime()) < 60_000, createdUploadedAt);
  r = await req('GET', attachments(NOVA_ID, sprint4.id) + `/${createdId}`);
  check('detail logs MEETING_ATTACHMENT_CREATED', r.json.data.latestActivity?.action === 'MEETING_ATTACHMENT_CREATED', JSON.stringify(r.json.data.latestActivity));

  r = await req('POST', attachments(NOVA_ID, sprint4.id), { ...valid, uploadedAt: '2026-10-01T10:00:00Z' });
  check('explicit uploadedAt honored', r.status === 201 && r.json.data.uploadedAt.startsWith('2026-10-01'));
  const explicitId = r.json?.data?.id;

  r = await req('POST', attachments(NOVA_ID, sprint4.id), { ...valid, fileName: 'qbr-notes.pdf' });
  check('duplicate filename allowed → 201', r.status === 201);
  const dupId = r.json?.data?.id;

  r = await req('POST', attachments(NOVA_ID, sprint4.id), { fileName: 'x.pdf', fileType: 'audio', storagePath: `meetings/${NOVA_ID}/${sprint4.id}/x.pdf`, fileSize: 10 });
  check('MIME without subtype rejected (400)', r.status === 400);
  r = await req('POST', attachments(NOVA_ID, sprint4.id), { fileName: 'x.pdf', fileType: 'not a mime', storagePath: `meetings/${NOVA_ID}/${sprint4.id}/x.pdf`, fileSize: 10 });
  check('MIME with spaces rejected (400)', r.status === 400);
  r = await req('POST', attachments(NOVA_ID, sprint4.id), { fileName: 'x.docx', fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', storagePath: `meetings/${NOVA_ID}/${sprint4.id}/x.docx`, fileSize: 10 });
  check('complex Office MIME accepted', r.status === 201);
  const docxId = r.json?.data?.id;

  r = await req('POST', attachments(NOVA_ID, sprint4.id), { ...valid, storagePath: 'uploads/file.mp3' });
  check('storagePath without meetings/ prefix → 400', r.status === 400);
  r = await req('POST', attachments(NOVA_ID, sprint4.id), { ...valid, storagePath: 'meetings/' });
  check('storagePath meetings/ only → 400', r.status === 400);
  r = await req('POST', attachments(NOVA_ID, sprint4.id), { ...valid, fileSize: -1 });
  check('negative fileSize → 400', r.status === 400);
  r = await req('POST', attachments(NOVA_ID, sprint4.id), { ...valid, fileSize: 2.5 });
  check('non-integer fileSize → 400', r.status === 400);
  r = await req('POST', attachments(NOVA_ID, sprint4.id), { fileType: 'text/plain', storagePath: `meetings/${NOVA_ID}/x.txt`, fileSize: 10 });
  check('missing fileName → 400', r.status === 400);
  r = await req('POST', attachments(NOVA_ID, sprint4.id), { fileName: '   ', fileType: 'text/plain', storagePath: `meetings/${NOVA_ID}/x.txt`, fileSize: 10 });
  check('blank fileName → 400', r.status === 400);
  r = await req('POST', attachments(NOVA_ID, sprint4.id), { fileName: 'a'.repeat(256), fileType: 'text/plain', storagePath: `meetings/${NOVA_ID}/x.txt`, fileSize: 10 });
  check('fileName > 255 chars → 400', r.status === 400);
  r = await req('POST', attachments(NOVA_ID, sprint4.id), { fileName: 'x', fileType: 'text/plain', storagePath: `meetings/${NOVA_ID}/x.txt` });
  check('missing fileSize → 400', r.status === 400);
  r = await req('POST', attachments(NOVA_ID, sprint4.id), { ...valid, uploadedAt: 123 });
  check('numeric uploadedAt → 400', r.status === 400);
  r = await req('POST', attachments(NOVA_ID, sprint4.id), { ...valid, hacker: true });
  check('unknown property → 400', r.status === 400);
  r = await req('POST', attachments(NOVA_ID, RANDOM_ID), valid);
  check('POST to missing meeting → 404', r.status === 404);
  r = await req('POST', attachments(RANDOM_ID, RANDOM_ID), valid);
  check('POST to missing project → 404', r.status === 404);

  console.log('\n——— PATCH ———');
  r = await req('PATCH', attachments(NOVA_ID, sprint4.id) + `/${createdId}`, { fileName: 'qbr-notes-final.pdf', fileSize: 30720 });
  check('PATCH valid → 200 + updated fields', r.status === 200 && r.json.data.fileName === 'qbr-notes-final.pdf' && r.json.data.fileSize === 30720);
  r = await req('GET', attachments(NOVA_ID, sprint4.id) + `/${createdId}`);
  check('PATCH logs MEETING_ATTACHMENT_UPDATED', r.json.data.latestActivity?.action === 'MEETING_ATTACHMENT_UPDATED', JSON.stringify(r.json.data.latestActivity));

  r = await req('PATCH', attachments(NOVA_ID, sprint4.id) + `/${createdId}`, { fileType: 'bogus-mime' });
  check('PATCH invalid MIME → 400', r.status === 400);
  r = await req('PATCH', attachments(NOVA_ID, sprint4.id) + `/${createdId}`, { storagePath: 'other/segment/file.pdf' });
  check('PATCH storagePath prefix violation → 400', r.status === 400);
  r = await req('PATCH', attachments(NOVA_ID, sprint4.id) + `/${createdId}`, { uploadedAt: '2026-10-02' });
  check('PATCH uploadedAt forbidden (400)', r.status === 400);
  r = await req('PATCH', attachments(NOVA_ID, sprint4.id) + `/${createdId}`, { bogus: 1 });
  check('PATCH unknown property → 400', r.status === 400);
  r = await req('PATCH', attachments(NOVA_ID, sprint4.id) + `/${RANDOM_ID}`, { fileName: 'Ghost' });
  check('PATCH unknown attachment → 404', r.status === 404);

  console.log('\n——— DELETE ———');
  r = await req('DELETE', attachments(NOVA_ID, sprint4.id) + `/${createdId}`);
  check('DELETE → 200 envelope', r.status === 200 && r.json.success === true && r.json.data.id === createdId);
  r = await req('GET', attachments(NOVA_ID, sprint4.id) + `/${createdId}`);
  check('deleted attachment → 404', r.status === 404);
  r = await req('GET', `/projects/${NOVA_ID}`);
  check('project audit trail logs MEETING_ATTACHMENT_DELETED', r.json.data.latestActivity?.action === 'MEETING_ATTACHMENT_DELETED', JSON.stringify(r.json.data.latestActivity));
  r = await req('DELETE', attachments(NOVA_ID, sprint4.id) + `/${createdId}`);
  check('DELETE again → 404', r.status === 404);

  // cleanup extra rows created above
  for (const id of [explicitId, dupId, docxId]) {
    await req('DELETE', attachments(NOVA_ID, sprint4.id) + `/${id}`);
  }

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
