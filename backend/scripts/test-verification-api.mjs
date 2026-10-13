/**
 * End-to-end Scope Verification API tests (Phase 10): ephemeral PostgreSQL +
 * compiled Nest app + deterministic development AI provider; covers the
 * verify trigger (POST /projects/:projectId/commitments/:commitmentId/verify),
 * deterministic lexical scope matching (in-scope → LOW, out-of-scope → HIGH,
 * partial overlap → MEDIUM), authorization exclusively from database state
 * (APPROVED change request authorizes; PENDING/REJECTED never do),
 * cross-project/missing-resource 404s, UUID validation, idempotent repeat
 * verification without duplicate audit records, post-transaction integration
 * with the Phase 8 analysis pipeline, and the pure matcher itself.
 * The real Fireworks API is never called (provider is "development").
 * Usage: node scripts/test-verification-api.mjs
 */
import EmbeddedPostgres from 'embedded-postgres';
import { signToken, TEST_JWT_SECRET, USER_A } from './lib/auth-helper.mjs';
import { spawn, execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { matchScope } from '../dist/scope-verification/scope-matcher.js';

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
  MEETING_ANALYSIS_PROVIDER: 'development',
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

const verify = (projectId, commitmentId) =>
  `/projects/${projectId}/commitments/${commitmentId}/verify`;

let api;
let prisma = null;
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

  // ——— pure matcher sanity (spec examples, via compiled module) ———
  console.log('\n—— Scope matcher (deterministic, no AI, no pgvector) ——');
  const ex1 = matchScope('Add email and password login', [
    { id: 'r1', title: 'User authentication including email/password login' },
  ]);
  check('matcher: spec example — email/password login matches authentication scope', ex1.status === 'MATCHED', JSON.stringify(ex1));
  const ex1b = matchScope('ADD EMAIL AND PASSWORD LOGIN', [
    { id: 'r1', title: 'User authentication including email/password login' },
  ]);
  check('matcher: case-insensitive tokens match identically', ex1b.status === 'MATCHED' && ex1b.score === ex1.score);
  const ex2 = matchScope('Add Google Login', [
    { id: 'r2', title: 'Checkout with credit card payments' },
  ]);
  check('matcher: spec example — Google Login does NOT match checkout scope', ex2.status === 'NOT_MATCHED', JSON.stringify(ex2));
  const ex3 = matchScope('Add a credit card wallet pass to checkout', [
    { id: 'r3', title: 'Checkout with credit card payments', description: 'Checkout flow with credit card payments and saved billing addresses.' },
  ]);
  check('matcher: partial overlap is ambiguous, not a match', ex3.status === 'AMBIGUOUS', JSON.stringify(ex3));
  const ex1repeat = matchScope('Add email and password login', [
    { id: 'r1', title: 'User authentication including email/password login' },
  ]);
  check('matcher: repeat run is byte-identical (deterministic)', JSON.stringify(ex1repeat) === JSON.stringify(ex1));

  // ——— fixtures (created through the real API) ———
  console.log('\n—— Fixtures ——');
  const proj = (await req('POST', '/projects', {
    name: 'Phase 10 Verification Project',
    clientName: 'VerifyCorp',
  })).json.data;

  const meeting = (await req('POST', `/projects/${proj.id}/meetings`, {
    title: 'Verification Fixture Meeting',
    meetingDate: '2026-10-11T09:00:00Z',
    summary: 'Fixture meeting for scope verification.',
  })).json.data;

  const r1 = (await req('POST', `/projects/${proj.id}/scope`, {
    title: 'User authentication including email/password login',
    description: 'Users sign in with email and password.',
    category: 'Authentication',
    approvalStatus: 'AUTHORIZED',
  })).json.data;
  const r2 = (await req('POST', `/projects/${proj.id}/scope`, {
    title: 'Checkout with credit card payments',
    description: 'Checkout flow with credit card payments and saved billing addresses.',
    category: 'Payments',
    approvalStatus: 'AUTHORIZED',
  })).json.data;
  const r3 = (await req('POST', `/projects/${proj.id}/scope`, {
    title: 'Loyalty points pilot',
    description: 'Earn and burn loyalty points.',
    category: 'Growth',
    approvalStatus: 'PENDING',
  })).json.data;

  const mkCommitment = async (title, description) =>
    (await req('POST', `/projects/${proj.id}/commitments`, {
      title,
      description,
      speaker: 'Dana Client',
      meetingId: meeting.id,
    })).json.data;

  const inScope = await mkCommitment(
    'Add email and password login',
    'Promise to support email and password login for all users.',
  );
  const outOfScope = await mkCommitment(
    'Add WhatsApp order status updates',
    'Team promised WhatsApp notifications for orders.',
  );
  const ambiguous = await mkCommitment(
    'Add a credit card wallet pass to checkout',
    'Client asked for a wallet pass on the checkout screen.',
  );
  // Zero lexical overlap with every fixture requirement — the clean
  // "clearly outside scope" case for the change-request scenarios.
  const crCommitment = await mkCommitment(
    'Add Telegram bot alerts for deployments',
    'Team promised Telegram alerts when deployments finish.',
  );

  // Change requests have no REST surface (seed-only model so far), so the
  // authorization fixtures are written directly — fixture setup only; the
  // verification logic itself still reads them through application state.
  prisma = new PrismaClient({
    datasources: { db: { url: env.DATABASE_URL } },
  });

  // Seeded fixtures with change requests (control group on seed data).
  const novaAll = (await req('GET', `/projects/${NOVA_ID}/commitments?limit=100`)).json.data.items;
  const novaCsv = novaAll.find((c) => c.title.startsWith('CSV export')); // CR-002 APPROVED
  const cartAll = (await req('GET', `/projects/${CART_ID}/commitments?limit=100`)).json.data.items;
  const cartWallet = cartAll.find((c) => c.title.startsWith('Apple/Google wallet pass')); // CR-102 REJECTED

  // ——— A. in-scope commitment → LOW / approved scope ———
  console.log('\n—— A. In-scope commitment → LOW ——');
  let r = await req('POST', verify(proj.id, inScope.id));
  check('A: verify returns 200 envelope', r.status === 200 && r.json?.success === true);
  check('A: scopeMatch is true', r.json.data.scopeMatch === true, JSON.stringify(r.json.data));
  check('A: matched requirement is the approved authentication requirement', r.json.data.matchedScopeRequirement?.id === r1.id);
  check('A: authorization found via APPROVED_SCOPE', r.json.data.authorizationFound === true && r.json.data.authorizationSource === 'APPROVED_SCOPE');
  check('A: risk LOW + commitment AUTHORIZED', r.json.data.risk === 'LOW' && r.json.data.authorizationStatus === 'AUTHORIZED');
  check('A: explanation names the matched requirement', r.json.data.explanation.includes(r1.title));
  check('A: verifiedAt is an ISO timestamp', !Number.isNaN(Date.parse(r.json.data.verifiedAt)));
  let detail = (await req('GET', `/projects/${proj.id}/commitments/${inScope.id}`)).json.data;
  check('A: commitment persisted riskLevel/authorizationStatus', detail.riskLevel === 'LOW' && detail.authorizationStatus === 'AUTHORIZED');
  check('A: COMMITMENT_VERIFIED audit recorded', detail.latestActivity?.action === 'COMMITMENT_VERIFIED', JSON.stringify(detail.latestActivity));

  // ——— B. out-of-scope, no authorization → HIGH ———
  console.log('\n—— B. Out-of-scope, unauthorized → HIGH ——');
  r = await req('POST', verify(proj.id, outOfScope.id));
  check('B: scopeMatch is false, no matched requirement', r.json.data.scopeMatch === false && r.json.data.matchedScopeRequirement === null, JSON.stringify(r.json.data));
  check('B: authorizationFound false, source null', r.json.data.authorizationFound === false && r.json.data.authorizationSource === null);
  check('B: risk HIGH + commitment UNAUTHORIZED', r.json.data.risk === 'HIGH' && r.json.data.authorizationStatus === 'UNAUTHORIZED');

  // ——— C. out-of-scope but APPROVED change request → LOW ———
  console.log('\n—— C. Approved change request authorizes → LOW ——');
  await prisma.changeRequest.create({
    data: {
      projectId: proj.id,
      commitmentId: crCommitment.id,
      title: 'CR-900: Telegram deployment alerts',
      description: 'Client-approved add-on for Telegram alerts.',
      status: 'APPROVED',
      approvalReason: 'Approved by VerifyCorp on 2026-10-10.',
    },
  });
  r = await req('POST', verify(proj.id, crCommitment.id));
  check('C: scopeMatch false (clearly outside approved scope)', r.json.data.scopeMatch === false && r.json.data.matchedScopeRequirement === null, JSON.stringify(r.json.data));
  check('C: authorization found via CHANGE_REQUEST', r.json.data.authorizationFound === true && r.json.data.authorizationSource === 'CHANGE_REQUEST', JSON.stringify(r.json.data));
  check('C: risk LOW + commitment AUTHORIZED', r.json.data.risk === 'LOW' && r.json.data.authorizationStatus === 'AUTHORIZED');
  check('C: explanation cites the approved change request (CR-900)', r.json.data.explanation.includes('CR-900'));

  // Seeded control: an approved-scope match on real demo data (CR-002 also
  // exists for this commitment, but the approved scope claims the match).
  r = await req('POST', verify(NOVA_ID, novaCsv.id));
  check('C (seed): CSV export resolves LOW/AUTHORIZED on seed data', r.json.data.authorizationFound === true && r.json.data.risk === 'LOW' && r.json.data.authorizationStatus === 'AUTHORIZED', JSON.stringify(r.json.data));

  // ——— D. PENDING change request does NOT authorize ———
  console.log('\n—— D. Pending change request → still unauthorized ——');
  await prisma.changeRequest.create({
    data: {
      projectId: proj.id,
      commitmentId: outOfScope.id,
      title: 'CR-901: WhatsApp order updates',
      description: 'Proposed add-on, awaiting client decision.',
      status: 'PENDING',
    },
  });
  r = await req('POST', verify(proj.id, outOfScope.id));
  check('D: scopeMatch false and no authorization despite PENDING change request', r.json.data.scopeMatch === false && r.json.data.authorizationFound === false && r.json.data.authorizationSource === null, JSON.stringify(r.json.data));
  check('D: risk HIGH + UNAUTHORIZED', r.json.data.risk === 'HIGH' && r.json.data.authorizationStatus === 'UNAUTHORIZED');

  // ——— E. REJECTED change request does NOT authorize ———
  console.log('\n—— E. Rejected change request → still unauthorized ——');
  r = await req('POST', verify(CART_ID, cartWallet.id));
  check('E: authorizationFound false despite existing change request', r.json.data.authorizationFound === false && r.json.data.authorizationSource === null, JSON.stringify(r.json.data));
  check('E: risk HIGH + UNAUTHORIZED', r.json.data.risk === 'HIGH' && r.json.data.authorizationStatus === 'UNAUTHORIZED');

  // ——— F. ambiguous overlap → MEDIUM / needs review ———
  console.log('\n—— F. Ambiguous overlap → MEDIUM ——');
  r = await req('POST', verify(proj.id, ambiguous.id));
  check('F: scopeMatch is null (ambiguous)', r.json.data.scopeMatch === null, JSON.stringify(r.json.data));
  check('F: partial match surfaces the requirement under review', r.json.data.matchedScopeRequirement?.id === r2.id);
  check('F: no authorization', r.json.data.authorizationFound === false && r.json.data.authorizationSource === null);
  check('F: risk MEDIUM + commitment PENDING (needs human review)', r.json.data.risk === 'MEDIUM' && r.json.data.authorizationStatus === 'PENDING');

  // ——— G. cross-project access → 404 ———
  console.log('\n—— G. Project ownership enforcement ——');
  r = await req('POST', verify(NOVA_ID, inScope.id));
  check('G: verification under wrong project → 404', r.status === 404);
  r = await req('POST', verify(proj.id, novaCsv.id));
  check('G: other project’s commitment under this project → 404', r.status === 404);

  // ——— H. missing resources → 404 ———
  console.log('\n—— H. Missing resources ——');
  r = await req('POST', verify(proj.id, RANDOM_ID));
  check('H: unknown commitment → 404', r.status === 404);
  r = await req('POST', verify(RANDOM_ID, inScope.id));
  check('H: unknown project → 404', r.status === 404);

  // ——— I. validation ———
  console.log('\n—— I. Validation ——');
  r = await req('POST', `/projects/not-a-uuid/commitments/${inScope.id}/verify`);
  check('I: non-UUID project → 400', r.status === 400);
  r = await req('POST', verify(proj.id, 'nope'));
  check('I: non-UUID commitment → 400', r.status === 400);

  // ——— J. repeat verification is deterministic, no duplicate audit ———
  console.log('\n—— J. Repeat verification determinism ——');
  const first = (await req('POST', verify(proj.id, inScope.id))).json.data;
  const detailBefore = (await req('GET', `/projects/${proj.id}/commitments/${inScope.id}`)).json.data;
  const second = (await req('POST', verify(proj.id, inScope.id))).json.data;
  check('J: repeated verification returns identical result (incl. verifiedAt)', JSON.stringify(second) === JSON.stringify(first), `${JSON.stringify(first)} vs ${JSON.stringify(second)}`);
  const detailAfter = (await req('GET', `/projects/${proj.id}/commitments/${inScope.id}`)).json.data;
  check('J: no-op repeat did not touch the commitment (updatedAt unchanged)', detailAfter.updatedAt === detailBefore.updatedAt);
  check('J: still exactly the same single audit entry', detailAfter.latestActivity?.createdAt === detailBefore.latestActivity?.createdAt && detailAfter.latestActivity?.action === 'COMMITMENT_VERIFIED');

  // J2 — a CHANGED outcome must produce a new audit entry.
  const changed = await mkCommitment(
    'Add email and password login',
    'Promise to support email and password login for all users.',
  );
  const firstRun = (await req('POST', verify(proj.id, changed.id))).json.data;
  check('J2: initial verification is LOW (in scope)', firstRun.risk === 'LOW');
  await req('PATCH', `/projects/${proj.id}/commitments/${changed.id}`, {
    title: 'Add WhatsApp order status updates',
    description: 'Team promised WhatsApp notifications for orders.',
  });
  const secondRun = (await req('POST', verify(proj.id, changed.id))).json.data;
  check('J2: re-verification after scope drift → HIGH', secondRun.risk === 'HIGH' && secondRun.authorizationStatus === 'UNAUTHORIZED', JSON.stringify(secondRun));
  detail = (await req('GET', `/projects/${proj.id}/commitments/${changed.id}`)).json.data;
  check('J2: new audit entry records the NEW outcome', detail.latestActivity?.action === 'COMMITMENT_VERIFIED' && detail.latestActivity?.description === secondRun.explanation && detail.latestActivity?.description !== firstRun.explanation);

  // ——— K. Phase 8/9 analysis pipeline intact + post-commit verification ———
  console.log('\n—— K. Analysis pipeline integration (post-transaction) ——');
  const transcript = 'Dana: We will add a referral code feature by Friday.';
  const kMeeting = (await req('POST', `/projects/${NOVA_ID}/meetings`, {
    title: 'Phase 10 Analysis Integration',
    meetingDate: '2026-10-11T11:00:00Z',
    summary: transcript,
  })).json.data;
  await req('POST', `/projects/${NOVA_ID}/meetings/${kMeeting.id}/attachments`, {
    fileName: 'phase10-transcript.txt',
    fileType: 'text/plain',
    storagePath: 'meetings/novabank/phase10-transcript.txt',
    fileSize: transcript.length,
  });
  r = await req('POST', `/projects/${NOVA_ID}/meetings/${kMeeting.id}/analyze`);
  check('K: analysis still completes (Phase 8 pipeline intact)', r.status === 200 && r.json.data.analysisStatus === 'COMPLETED', JSON.stringify(r.json?.data?.analysisStatus));
  check('K: analyze response still reports creation-time PENDING authorization', Array.isArray(r.json.data.commitments) && r.json.data.commitments.every((c) => c.authorizationStatus === 'PENDING'));
  const kCommitments = (await req('GET', `/meetings/${kMeeting.id}/commitments`)).json.data.items;
  check('K: analysis created commitments', kCommitments.length > 0);
  const kDetails = await Promise.all(
    kCommitments.map((c) => req('GET', `/projects/${NOVA_ID}/commitments/${c.id}`)),
  );
  check(
    'K: every AI-created commitment was scope-verified after the transaction committed',
    kDetails.every((d) => d.json.data.latestActivity?.action === 'COMMITMENT_VERIFIED'),
    JSON.stringify(kDetails.map((d) => d.json.data.latestActivity?.action)),
  );
  check(
    'K: verified commitments carry a deterministic DB-backed risk level',
    kDetails.every((d) => ['LOW', 'MEDIUM', 'HIGH'].includes(d.json.data.riskLevel)),
  );
  const kMeetingDetail = (await req('GET', `/projects/${NOVA_ID}/meetings/${kMeeting.id}`)).json.data;
  check('K: meeting-level audit still MEETING_ANALYZED (verification did not pollute it)', kMeetingDetail.latestActivity?.action === 'MEETING_ANALYZED');

  console.log(`\n${results.filter((x) => x.ok).length}/${results.length} checks passed`);
  if (results.some((x) => !x.ok)) process.exitCode = 1;
} catch (err) {
  console.error('Test run crashed:', err);
  process.exitCode = 1;
} finally {
  try {
    if (api) api.kill();
    await pg.stop();
  } catch {
    /* already down */
  }
  try {
    if (prisma) await prisma.$disconnect();
  } catch {
    /* prisma never constructed */
  }
}

// Force-exit: an embedded-postgres child handle can outlive the suite on
// Windows and block a clean exit after the summary has printed.
process.exit(process.exitCode || 0);
