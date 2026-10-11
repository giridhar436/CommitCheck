/**
 * End-to-end Meeting Analysis API tests (Phase 8, dev-only): ephemeral
 * PostgreSQL + compiled Nest app + the deterministic development AI provider;
 * covers the analyze trigger (POST /projects/:projectId/meetings/:meetingId/
 * analyze), UUID/ownership validation, status guards (PROCESSING/COMPLETED →
 * 409), missing-transcript handling, commitment/evidence creation with
 * confidence bounds, MEETING_ANALYZED activity, provider-failure rollback,
 * and preservation of pre-existing commitments/evidence.
 * Usage: node scripts/test-analysis-api.mjs
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

const analyze = (projectId, meetingId) =>
  `/projects/${projectId}/meetings/${meetingId}/analyze`;

async function createMeeting(body) {
  const r = await req('POST', `/projects/${body.projectId ?? NOVA_ID}/meetings`, {
    title: body.title,
    meetingDate: body.meetingDate,
    ...(body.summary !== undefined ? { summary: body.summary } : {}),
  });
  return r.json.data;
}
async function createAttachment(projectId, meetingId, body) {
  const r = await req(
    'POST',
    `/projects/${projectId}/meetings/${meetingId}/attachments`,
    body,
  );
  return r.json.data;
}

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
  const sprint4 = novaMeetings.find((m) => m.title.includes('Sprint 4'));
  const processingMeeting = novaMeetings.find((m) => m.analysisStatus === 'PROCESSING');
  const cartMeetings = (await req('GET', `/projects/${CART_ID}/meetings`)).json.data.items;
  const cartMeeting = cartMeetings[0];

  // Baseline: seeded commitments/evidence that must survive Phase 8 untouched.
  const novaCommitmentsBefore = (await req('GET', `/projects/${NOVA_ID}/commitments?limit=100`)).json.data.totalItems;
  const googleBefore = (await req('GET', `/projects/${NOVA_ID}/commitments?search=google`)).json.data.items[0];
  const googleEvidenceBefore = (await req('GET', `/projects/${NOVA_ID}/commitments/${googleBefore.id}/evidence`)).json.data.totalItems;

  // ——— fixtures ———
  const transcript = [
    'Dana: We will add Google Login to the onboarding flow by Friday.',
    'Miguel: I can add a CSV export button to the analytics dashboard next week.',
    'Dana: We are going to polish the P2P transfer confirmation screen in Sprint 5.',
  ].join('\n');

  const m1 = await createMeeting({
    title: 'Phase 8 Analysis Happy Path',
    meetingDate: '2026-10-10T10:00:00Z',
    summary: transcript,
  });
  await createAttachment(NOVA_ID, m1.id, {
    fileName: 'phase8-transcript.txt',
    fileType: 'text/plain',
    storagePath: 'meetings/novabank/phase8-transcript.txt',
    fileSize: transcript.length,
  });
  // A manually-created commitment that must survive the analysis untouched.
  const manual = (await req('POST', `/projects/${NOVA_ID}/commitments`, {
    title: 'Manual pre-existing commitment',
    description: 'Created via the Phase 6 API before analysis ran.',
    speaker: 'Varun (QA)',
    meetingId: m1.id,
  })).json.data;

  const mAudio = await createMeeting({
    title: 'Phase 8 Audio-Only Meeting',
    meetingDate: '2026-10-10T11:00:00Z',
    summary: 'Client floated adding card freeze/unfreeze.',
  });
  await createAttachment(NOVA_ID, mAudio.id, {
    fileName: 'adhoc-call.m4a',
    fileType: 'audio/mp4',
    storagePath: 'meetings/novabank/adhoc-call.m4a',
    fileSize: 1024,
  });

  const mFail = await createMeeting({
    title: 'Phase 8 Provider Failure Meeting',
    meetingDate: '2026-10-10T12:00:00Z',
    summary: transcript,
  });
  await createAttachment(NOVA_ID, mFail.id, {
    fileName: 'good-transcript.txt',
    fileType: 'text/plain',
    storagePath: 'meetings/novabank/good-transcript.txt',
    fileSize: transcript.length,
  });
  await createAttachment(NOVA_ID, mFail.id, {
    fileName: 'broken-transcript.fail.txt',
    fileType: 'text/plain',
    storagePath: 'meetings/novabank/broken-transcript.fail.txt',
    fileSize: 10,
  });

  const mRace = await createMeeting({
    title: 'Phase 8 Concurrent Trigger Meeting',
    meetingDate: '2026-10-10T13:00:00Z',
    summary: 'Priya: We will deliver the loyalty points pilot report by next week.',
  });
  await createAttachment(NOVA_ID, mRace.id, {
    fileName: 'race-transcript.txt',
    fileType: 'text/markdown',
    storagePath: 'meetings/novabank/race-transcript.txt',
    fileSize: 10,
  });

  const mClean = await createMeeting({
    title: 'Phase 8 Clean Meeting',
    meetingDate: '2026-10-10T14:00:00Z',
    summary: 'Walked through the SOW. No new work was discussed.',
  });
  await createAttachment(NOVA_ID, mClean.id, {
    fileName: 'clean-notes.txt',
    fileType: 'text/plain',
    storagePath: 'meetings/novabank/clean-notes.txt',
    fileSize: 10,
  });

  console.log('\n——— validation & ownership ———');
  let r = await req('POST', `/projects/not-a-uuid/meetings/${m1.id}/analyze`);
  check('invalid project UUID → 400', r.status === 400 && r.json.success === false);
  r = await req('POST', `/projects/${NOVA_ID}/meetings/not-a-uuid/analyze`);
  check('invalid meeting UUID → 400', r.status === 400 && r.json.success === false);
  r = await req('POST', `/projects/${RANDOM_ID}/meetings/${m1.id}/analyze`);
  check('missing project → 404', r.status === 404, JSON.stringify(r.json));
  r = await req('POST', `/projects/${NOVA_ID}/meetings/${RANDOM_ID}/analyze`);
  check('missing meeting → 404', r.status === 404);
  r = await req('POST', `/projects/${CART_ID}/meetings/${m1.id}/analyze`);
  check('meeting belonging to another project → 404', r.status === 404);
  r = await req('POST', `/projects/${NOVA_ID}/meetings/${cartMeeting.id}/analyze`);
  check('cross-project combination (cart meeting under nova) → 404', r.status === 404);

  console.log('\n——— no usable transcript ———');
  r = await req('POST', analyze(NOVA_ID, mAudio.id));
  check('audio-only meeting → 422 with clear message', r.status === 422 && /transcript/i.test(r.json.message), JSON.stringify(r.json));
  r = await req('GET', `/projects/${NOVA_ID}/meetings/${mAudio.id}`);
  check('no usable transcript leaves analysisStatus NOT_STARTED', r.json.data.analysisStatus === 'NOT_STARTED', r.json.data.analysisStatus);
  check('no commitments were created for it', r.json.data.commitmentCount === 0);

  console.log('\n——— happy path (NOT_STARTED → COMPLETED) ———');
  r = await req('POST', analyze(NOVA_ID, m1.id));
  const result = r.json?.data;
  check('analyze → 200 envelope', r.status === 200 && r.json.success === true, JSON.stringify(r.json));
  check('analysisStatus COMPLETED in response', result?.analysisStatus === 'COMPLETED');
  check('3 commitments detected deterministically', result?.commitmentsCreated === 3, JSON.stringify(result?.commitmentsCreated));
  check('evidenceCreated matches commitments', result?.evidenceCreated === 3);
  check('commitmentsCreated === commitments.length', result?.commitmentsCreated === result?.commitments.length);
  check('returned commitments carry correct projectId', result.commitments.every((c) => c.projectId === NOVA_ID));
  check('returned commitments carry correct meetingId', result.commitments.every((c) => c.meetingId === m1.id));
  check('confidenceScore within 0–1', result.commitments.every((c) => c.confidenceScore >= 0 && c.confidenceScore <= 1), JSON.stringify(result.commitments.map((c) => c.confidenceScore)));
  check('AI never authorizes work (PENDING)', result.commitments.every((c) => c.authorizationStatus === 'PENDING'));

  r = await req('GET', `/projects/${NOVA_ID}/meetings/${m1.id}`);
  check('meeting persisted COMPLETED', r.json.data.analysisStatus === 'COMPLETED');
  check('meeting commitmentCount includes analysis results', r.json.data.commitmentCount === 4, JSON.stringify(r.json.data.commitmentCount));

  const analysisCommitments = result.commitments;
  let evidenceRows = 0;
  let allLinked = true;
  for (const commitment of analysisCommitments) {
    const er = await req('GET', `/projects/${NOVA_ID}/commitments/${commitment.id}/evidence`);
    evidenceRows += er.json.data.totalItems;
    allLinked &&= er.json.data.totalItems > 0 && er.json.data.items.every((e) => e.commitmentId === commitment.id);
  }
  check('evidence created for every detected commitment', evidenceRows === 3, JSON.stringify(evidenceRows));
  check('evidence points at its own commitment (no orphans)', allLinked);
  check('commitment detail evidenceCount is consistent', (await req('GET', `/projects/${NOVA_ID}/commitments/${analysisCommitments[0].id}`)).json.data.evidenceCount === 1);

  r = await req('GET', `/projects/${NOVA_ID}/meetings/${m1.id}`);
  check('meeting detail latestActivity is MEETING_ANALYZED', r.json.data.latestActivity?.action === 'MEETING_ANALYZED', JSON.stringify(r.json.data.latestActivity));
  check('activity entityType=MEETING, entityId=meeting UUID', r.json.data.latestActivity?.entityType === 'MEETING' && r.json.data.latestActivity?.entityId === m1.id);

  console.log('\n——— clean meeting ———');
  r = await req('POST', analyze(NOVA_ID, mClean.id));
  check('meeting without promises → COMPLETED with 0 commitments', r.status === 200 && r.json.data.analysisStatus === 'COMPLETED' && r.json.data.commitmentsCreated === 0, JSON.stringify(r.json.data));

  console.log('\n——— guards (idempotency) ———');
  r = await req('POST', analyze(NOVA_ID, m1.id));
  check('COMPLETED meeting cannot be re-analyzed → 409', r.status === 409 && /already completed/i.test(r.json.message), JSON.stringify(r.json));
  r = await req('GET', `/projects/${NOVA_ID}/meetings/${m1.id}`);
  check('re-analysis created no duplicate commitments', r.json.data.commitmentCount === 4, JSON.stringify(r.json.data.commitmentCount));
  r = await req('POST', analyze(NOVA_ID, processingMeeting.id));
  check('PROCESSING meeting cannot be analyzed → 409', r.status === 409 && /already in progress/i.test(r.json.message), JSON.stringify(r.json));

  console.log('\n——— concurrent triggers ———');
  const [first, second] = await Promise.all([
    req('POST', analyze(NOVA_ID, mRace.id)),
    req('POST', analyze(NOVA_ID, mRace.id)),
  ]);
  const statuses = [first.status, second.status].sort((a, b) => a - b);
  check('exactly one 2xx and one 409 for concurrent triggers', statuses[0] === 200 && statuses[1] === 409, JSON.stringify(statuses));
  r = await req('GET', `/projects/${NOVA_ID}/meetings/${mRace.id}`);
  check('concurrent run produced no duplicate commitments', r.json.data.commitmentCount === 1, JSON.stringify(r.json.data.commitmentCount));

  console.log('\n——— provider failure ———');
  const failBaseline = (await req('GET', `/projects/${NOVA_ID}/commitments?limit=100`)).json.data.totalItems;
  r = await req('POST', analyze(NOVA_ID, mFail.id));
  check('failing provider → 502 envelope, no internals', r.status === 502 && r.json.success === false && !/Simulated/i.test(r.json.message), JSON.stringify(r.json));
  r = await req('GET', `/projects/${NOVA_ID}/meetings/${mFail.id}`);
  check('failed analysis marks meeting FAILED', r.json.data.analysisStatus === 'FAILED');
  check('failed analysis leaves no partial commitments', r.json.data.commitmentCount === 0, JSON.stringify(r.json.data.commitmentCount));
  const failAfter = (await req('GET', `/projects/${NOVA_ID}/commitments?limit=100`)).json.data.totalItems;
  check('failed analysis left project commitments unchanged', failAfter === failBaseline, `${failAfter} vs ${failBaseline}`);

  console.log('\n——— recovery after failure ———');
  // Remove the broken transcript (Phase 5 DELETE); the good one remains.
  const failAttachments = (await req('GET', `/projects/${NOVA_ID}/meetings/${mFail.id}/attachments`)).json.data.items;
  const broken = failAttachments.find((a) => a.fileName.includes('.fail.'));
  r = await req('DELETE', `/projects/${NOVA_ID}/meetings/${mFail.id}/attachments/${broken.id}`);
  check('broken attachment removed → 200', r.status === 200);
  r = await req('POST', analyze(NOVA_ID, mFail.id));
  check('FAILED meeting can be re-analyzed', r.status === 200 && r.json.data.analysisStatus === 'COMPLETED', JSON.stringify(r.json));
  r = await req('GET', `/projects/${NOVA_ID}/meetings/${mFail.id}`);
  check('recovered meeting is COMPLETED with commitments', r.json.data.analysisStatus === 'COMPLETED' && r.json.data.commitmentCount === 3, JSON.stringify(r.json.data.commitmentCount));

  console.log('\n——— existing data preserved ———');
  r = await req('GET', `/projects/${NOVA_ID}/commitments/${manual.id}`);
  check('manually-created commitment untouched by analysis', r.status === 200 && r.json.data.evidenceCount === 0, JSON.stringify(r.json.data));
  r = await req('GET', `/projects/${NOVA_ID}/commitments/${googleBefore.id}`);
  check('seeded NovaBank commitments preserved', r.status === 200 && r.json.data.title === 'Add Google Login to onboarding', JSON.stringify(r.json.data));
  const googleEvidenceAfter = (await req('GET', `/projects/${NOVA_ID}/commitments/${googleBefore.id}/evidence`)).json.data.totalItems;
  check('seeded evidence preserved', googleEvidenceAfter === googleEvidenceBefore, `${googleEvidenceAfter} vs ${googleEvidenceBefore}`);
  r = await req('GET', `/projects/${NOVA_ID}/commitments?limit=100`);
  check('project commitment totals add up (4 seeded + 1 manual + 3 + 1 + 3 detected)', r.json.data.totalItems === novaCommitmentsBefore + 8, `${r.json.data.totalItems} vs ${novaCommitmentsBefore}`);

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
