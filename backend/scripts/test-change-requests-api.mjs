/**
 * End-to-end Change Request workflow tests (Phase 11): ephemeral PostgreSQL +
 * compiled Nest app + deterministic development AI provider. Covers the
 * generate trigger (POST /projects/:projectId/commitments/:commitmentId/
 * change-request), the generation rules (only HIGH-risk out-of-scope
 * unauthorized commitments; ambiguous → conflict; in-scope/authorized →
 * conflict; duplicate open request → conflict), list/detail retrieval,
 * the approve/reject/clarification state machine (with authorization as a
 * transactional side effect of approval), invalid transitions, ownership
 * (404), validation (400), transaction rollback under an injected failure,
 * and a concurrent-approval race. The real Fireworks API is never called.
 * Usage: node scripts/test-change-requests-api.mjs
 */
import EmbeddedPostgres from 'embedded-postgres';
import { signToken, TEST_JWT_SECRET, USER_A } from './lib/auth-helper.mjs';
import { spawn, execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

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

const RANDOM_ID = '00000000-0000-4000-8000-000000000000';
const generate = (projectId, commitmentId) =>
  `/projects/${projectId}/commitments/${commitmentId}/change-request`;
const crPath = (projectId, id, action = '') =>
  `/projects/${projectId}/change-requests/${id}${action}`;

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

  prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });

  // ——— fixtures (all created through the real API, verified like a user) ———
  console.log('\n—— Fixtures ——');
  const proj = (await req('POST', '/projects', {
    name: 'Phase 11 Change Request Project',
    clientName: 'ApproveCorp',
  })).json.data;

  const meeting = (await req('POST', `/projects/${proj.id}/meetings`, {
    title: 'Phase 11 CR Meeting',
    meetingDate: '2026-10-11T09:00:00Z',
    summary: 'Fixture meeting for change request workflow.',
  })).json.data;

  // Approved scope: authentication only.
  const r1 = (await req('POST', `/projects/${proj.id}/scope`, {
    title: 'User authentication including email/password login',
    description: 'Users sign in with email and password.',
    category: 'Authentication',
    approvalStatus: 'AUTHORIZED',
  })).json.data;

  const mkCommitment = async (title, description) =>
    (await req('POST', `/projects/${proj.id}/commitments`, {
      title,
      description,
      speaker: 'Dana Client',
      meetingId: meeting.id,
    })).json.data;

  const verify = (c) =>
    req('POST', `/projects/${proj.id}/commitments/${c.id}/verify`);

  const highRisk = await mkCommitment(
    'Add Telegram bot alerts for deployments',
    'Team promised Telegram alerts when deployments finish.',
  );
  const inScope = await mkCommitment(
    'Add email and password login',
    'Promise to support email and password login for all users.',
  );
  const ambiguous = await mkCommitment(
    'Add a credit card wallet pass to checkout',
    'Client asked for a wallet pass on the checkout screen.',
  );
  // Make the checkout requirement approved so `ambiguous` verifies MEDIUM.
  await req('POST', `/projects/${proj.id}/scope`, {
    title: 'Checkout with credit card payments',
    description: 'Checkout flow with credit card payments and saved billing addresses.',
    category: 'Payments',
    approvalStatus: 'AUTHORIZED',
  });

  check('fixture: verify high-risk commitment → HIGH/UNAUTHORIZED', (await verify(highRisk)).json.data.risk === 'HIGH');
  check('fixture: verify in-scope commitment → LOW/AUTHORIZED', (await verify(inScope)).json.data.risk === 'LOW');
  check('fixture: verify ambiguous commitment → MEDIUM/PENDING', (await verify(ambiguous)).json.data.risk === 'MEDIUM');

  // ——— B. in-scope commitment → 409 (CR unnecessary) ———
  console.log('\n—— B. In-scope commitment → conflict ——');
  let r = await req('POST', generate(proj.id, inScope.id));
  check('B: in-scope commitment → 409', r.status === 409, String(r.status));
  check('B: message explains CR is unnecessary', String(r.json?.message ?? '').toLowerCase().includes('unnecessary'));

  // ——— D. ambiguous MEDIUM commitment → 409 (resolve verification first) ———
  console.log('\n—— D. Ambiguous commitment → conflict ——');
  r = await req('POST', generate(proj.id, ambiguous.id));
  check('D: ambiguous commitment → 409', r.status === 409, String(r.status));
  check('D: message asks to resolve verification first', String(r.json?.message ?? '').toLowerCase().includes('ambiguous'));

  // ——— A. create CR from HIGH-risk unauthorized commitment ———
  console.log('\n—— A. Generate CR from HIGH-risk commitment ——');
  r = await req('POST', generate(proj.id, highRisk.id));
  check('A: generation returns 201', r.status === 201, String(r.status));
  check('A: status is PENDING (pending approval)', r.json.data?.status === 'PENDING', JSON.stringify(r.json.data?.status));
  check('A: linked to the originating commitment', r.json.data?.commitmentId === highRisk.id && r.json.data?.commitment?.id === highRisk.id);
  check('A: feature/title taken from the commitment', r.json.data?.title === 'Add Telegram bot alerts for deployments');
  check('A: description carries the verification explanation (original scope context)', String(r.json.data?.description ?? '').includes('No approved scope requirement matches'));
  check('A: no client-authored fields (approvedBy etc. absent/null)', r.json.data?.approvalReason === null);
  const cr = r.json.data;

  // ——— E. duplicate open CR prevented ———
  console.log('\n—— E. Duplicate open CR prevented ——');
  r = await req('POST', generate(proj.id, highRisk.id));
  check('E: second generation for same commitment → 409', r.status === 409, String(r.status));

  // ——— F. list change requests ———
  console.log('\n—— F. List change requests ——');
  // A second CR on another commitment for list checks (generate → approve is done later).
  const second = await mkCommitment(
    'Add Telegram channel announcements',
    'Team promised weekly announcements in the Telegram channel.',
  );
  await verify(second);
  const cr2 = (await req('POST', generate(proj.id, second.id))).json.data;
  r = await req('GET', `/projects/${proj.id}/change-requests?page=1&limit=10`);
  check('F: list returns 200 envelope with pagination fields', r.status === 200 && r.json.data?.totalItems === 2 && Array.isArray(r.json.data.items));
  check('F: sorted by createdAt desc (newest first)', r.json.data.items[0].id === cr2.id);
  r = await req('GET', `/projects/${proj.id}/change-requests?status=PENDING`);
  check('F: status filter works', r.json.data.totalItems === 2);
  r = await req('GET', `/projects/${proj.id}/change-requests?status=APPROVED`);
  check('F: status filter excludes other statuses', r.json.data.totalItems === 0);

  // ——— G. detail ———
  console.log('\n—— G. Change request detail ——');
  r = await req('GET', crPath(proj.id, cr.id));
  check('G: detail returns 200 with commitment context', r.status === 200 && r.json.data.commitment?.id === highRisk.id);
  check('G: meeting title included (source context)', r.json.data.meetingTitle === 'Phase 11 CR Meeting');
  check('G: committedBy from the commitment speaker', r.json.data.commitment.speaker === 'Dana Client');

  // ——— K. invalid transitions BEFORE deciding (verify 409s) ———
  // (uses cr2 later after decisions; here confirm clarify→clarify works on open CR)
  console.log('\n—— J. Clarification flow (on cr2) ——');
  r = await req('POST', crPath(proj.id, cr2.id, '/clarification'), {});
  check('J: missing comment → 400', r.status === 400, String(r.status));
  r = await req('POST', crPath(proj.id, cr2.id, '/clarification'), { comment: '   ' });
  check('J: blank comment → 400', r.status === 400, String(r.status));
  r = await req('POST', crPath(proj.id, cr2.id, '/clarification'), {
    comment: 'Which Telegram library and who owns the bot token?',
  });
  check('J: clarification → 200 with CLARIFICATION_REQUESTED', r.status === 200 && r.json.data.status === 'CLARIFICATION_REQUESTED', JSON.stringify(r.json.data?.status));
  check('J: comment stored', String(r.json.data.clarificationComment ?? '').includes('bot token'));
  let commitmentDetail = (await req('GET', `/projects/${proj.id}/commitments/${second.id}`)).json.data;
  check('J: commitment still unauthorized with unchanged risk', commitmentDetail.authorizationStatus === 'UNAUTHORIZED' && commitmentDetail.riskLevel === 'HIGH');
  r = await req('POST', crPath(proj.id, cr2.id, '/clarification'), {
    comment: 'Second round of questions.',
  });
  check('J: clarification from CLARIFICATION_REQUESTED allowed (open state)', r.status === 200 && r.json.data.status === 'CLARIFICATION_REQUESTED');
  check('J: previous comment preserved (appended, not lost)', String(r.json.data.clarificationComment).includes('---') && r.json.data.clarificationComment.includes('bot token'));

  // ——— H. approve pending CR (back on cr) ———
  console.log('\n—— H. Approve pending CR ——');
  const crBefore = await prisma.changeRequest.findUnique({ where: { id: cr.id } });
  r = await req('POST', crPath(proj.id, cr.id, '/approve'), {
    reason: 'Client approved on the quarterly call.',
  });
  check('H: approve → 200 with APPROVED', r.status === 200 && r.json.data.status === 'APPROVED', JSON.stringify(r.json.data?.status));
  check('H: approval reason stored', r.json.data.approvalReason === 'Client approved on the quarterly call.');
  commitmentDetail = (await req('GET', `/projects/${proj.id}/commitments/${highRisk.id}`)).json.data;
  check('H: commitment authorized', commitmentDetail.authorizationStatus === 'AUTHORIZED');
  check('H: commitment risk LOW', commitmentDetail.riskLevel === 'LOW', commitmentDetail.riskLevel);
  r = await req('GET', crPath(proj.id, cr.id));
  check('H: relationship intact (detail still links commitment)', r.json.data.commitmentId === highRisk.id);
  const approvals = await prisma.activity.findMany({ where: { projectId: proj.id, action: 'CHANGE_REQUEST_APPROVED' } });
  check('H: approval audit created', approvals.length === 1 && approvals[0].entityId === cr.id);
  check('H: prior CR row was not replaced (same row updated)', crBefore && (await prisma.changeRequest.findUnique({ where: { id: cr.id } })).createdAt.getTime() === crBefore.createdAt.getTime());

  // ——— K. invalid transitions ———
  console.log('\n—— K. Invalid state transitions ——');
  r = await req('POST', crPath(proj.id, cr.id, '/reject'), { reason: 'too late' });
  check('K: APPROVED → reject → 409', r.status === 409, String(r.status));
  r = await req('POST', crPath(proj.id, cr.id, '/approve'), {});
  check('K: APPROVED → approve again → 409', r.status === 409, String(r.status));
  r = await req('POST', crPath(proj.id, cr.id, '/clarification'), { comment: 'hello?' });
  check('K: APPROVED → clarification → 409', r.status === 409, String(r.status));
  check('K: commitment remains authorized after rejected transitions', (await req('GET', `/projects/${proj.id}/commitments/${highRisk.id}`)).json.data.authorizationStatus === 'AUTHORIZED');

  // ——— C. already-authorized commitment → 409 ———
  console.log('\n—— C. Authorized commitment → conflict ——');
  r = await req('POST', generate(proj.id, highRisk.id));
  check('C: generating CR for authorized commitment → 409', r.status === 409, String(r.status));
  check('C: message explains CR is unnecessary', String(r.json?.message ?? '').toLowerCase().includes('unnecessary'));

  // ——— I. reject pending CR (on cr2) ———
  console.log('\n—— I. Reject pending CR ——');
  r = await req('POST', crPath(proj.id, cr2.id, '/reject'), {
    reason: 'Not billable this quarter.',
  });
  check('I: reject → 200 with REJECTED', r.status === 200 && r.json.data.status === 'REJECTED', JSON.stringify(r.json.data?.status));
  commitmentDetail = (await req('GET', `/projects/${proj.id}/commitments/${second.id}`)).json.data;
  check('I: commitment remains unauthorized', commitmentDetail.authorizationStatus === 'UNAUTHORIZED');
  check('I: commitment risk remains HIGH', commitmentDetail.riskLevel === 'HIGH');
  const rejections = await prisma.activity.findMany({ where: { projectId: proj.id, action: 'CHANGE_REQUEST_REJECTED' } });
  check('I: rejection audit created with reason', rejections.length === 1 && rejections[0].description.includes('Not billable'));

  // Rejected is terminal, but a NEW request may be generated (re-negotiation).
  r = await req('POST', generate(proj.id, second.id));
  check('I: new CR allowed after rejection (rejected is not blocking)', r.status === 201, String(r.status));
  check('I: the rejected CR stays untouched', (await prisma.changeRequest.findUnique({ where: { id: cr2.id } })).status === 'REJECTED');
  const cr3 = r.json.data;
  await req('POST', crPath(proj.id, cr3.id, '/reject'), { reason: 'cleanup' });

  // ——— L. cross-project access → 404 ———
  console.log('\n—— L. Cross-project access ——');
  const otherProject = (await req('POST', '/projects', {
    name: 'Phase 11 Other Project',
    clientName: 'OtherCorp',
  })).json.data;
  r = await req('POST', generate(otherProject.id, highRisk.id));
  check('L: generate under wrong project → 404', r.status === 404, String(r.status));
  r = await req('GET', crPath(otherProject.id, cr.id));
  check('L: detail under wrong project → 404', r.status === 404, String(r.status));
  r = await req('POST', crPath(otherProject.id, cr.id, '/approve'), {});
  check('L: approve under wrong project → 404', r.status === 404, String(r.status));

  // ——— M. missing resources → 404 ——
  console.log('\n—— M. Missing resources ——');
  r = await req('POST', generate(proj.id, RANDOM_ID));
  check('M: unknown commitment → 404', r.status === 404, String(r.status));
  r = await req('POST', generate(RANDOM_ID, highRisk.id));
  check('M: unknown project → 404', r.status === 404, String(r.status));
  r = await req('GET', crPath(proj.id, RANDOM_ID));
  check('M: unknown change request → 404', r.status === 404, String(r.status));
  r = await req('POST', crPath(proj.id, RANDOM_ID, '/reject'), {});
  check('M: unknown change request (reject) → 404', r.status === 404, String(r.status));

  // ——— N. invalid UUIDs → 400 ——
  console.log('\n—— N. Validation ——');
  r = await req('POST', generate('nope', highRisk.id));
  check('N: non-UUID project (generate) → 400', r.status === 400, String(r.status));
  r = await req('GET', crPath(proj.id, 'nope'));
  check('N: non-UUID change request (detail) → 400', r.status === 400, String(r.status));
  r = await req('POST', crPath(proj.id, cr.id, '/approve'), { reason: 42 });
  check('N: non-string reason → 400', r.status === 400, String(r.status));
  r = await req('GET', `/projects/${proj.id}/change-requests?status=NOT_A_STATUS`);
  check('N: unknown status filter → 400', r.status === 400, String(r.status));

  // ——— O. transaction rollback under injected failure ——
  console.log('\n—— O. Approval transaction rollback ——');
  // Service-level fault injection: every write of the approval flow runs
  // inside ONE $transaction; failing the audit write must leave neither the
  // CR nor the commitment modified by the service.
  const { ChangeRequestsService } = await import('../dist/change-requests/change-requests.service.js');
  const { PrismaService } = await import('../dist/prisma/prisma.service.js');
  const { ScopeVerificationService } = await import('../dist/scope-verification/scope-verification.service.js');

  const rollbackTarget = await mkCommitment(
    'Add Sentry error tracking to mobile app',
    'Team promised mobile crash reporting integration.',
  );
  await verify(rollbackTarget);
  const rollbackCr = (await req('POST', generate(proj.id, rollbackTarget.id))).json.data;
  const before = await prisma.changeRequest.findUnique({ where: { id: rollbackCr.id } });
  const commitmentBefore = await prisma.commitment.findUnique({ where: { id: rollbackTarget.id } });

  const failingPrisma = new PrismaService();
  // Replace $transaction with a callback that runs the service logic but
  // fails on the audit insert — simulating a mid-transaction crash.
  failingPrisma.$transaction = async (input) => {
    if (typeof input !== 'function') throw new Error('expected interactive transaction');
    const tx = new Proxy(failingPrisma, {
      get(t, prop) {
        if (prop === 'activity') {
          return {
            create: async () => {
              throw new Error('injected audit failure');
            },
          };
        }
        return t[prop];
      },
    });
    return input(tx);
  };

  const verificationStub = Object.create(ScopeVerificationService.prototype);
  verificationStub.verifyCommitment = async () => ({
    scopeMatch: false, matchedScopeRequirement: null, authorizationFound: false,
    authorizationSource: null, risk: 'HIGH', authorizationStatus: 'UNAUTHORIZED',
    explanation: 'stub', evidence: [], verifiedAt: new Date().toISOString(),
  });

  const svc = new ChangeRequestsService(failingPrisma, verificationStub);
  let failed = false;
  try {
    await svc.approve(proj.id, rollbackCr.id, 'should roll back');
  } catch {
    failed = true;
  }
  check('O: approval surfaces the injected failure', failed);
  const after = await prisma.changeRequest.findUnique({ where: { id: rollbackCr.id } });
  const commitmentAfter = await prisma.commitment.findUnique({ where: { id: rollbackTarget.id } });
  check('O: CR not partially updated (still PENDING)', after.status === 'PENDING' && after.updatedAt.getTime() === before.updatedAt.getTime());
  check('O: commitment untouched (still HIGH/UNAUTHORIZED)', commitmentAfter.riskLevel === commitmentBefore.riskLevel && commitmentAfter.authorizationStatus === commitmentBefore.authorizationStatus);
  await failingPrisma.$disconnect();

  // Concurrent approval race through the real API: exactly one winner.
  const raceTarget = await mkCommitment(
    'Add audit log export to admin panel',
    'Team promised admin panel audit export.',
  );
  await verify(raceTarget);
  const raceCr = (await req('POST', generate(proj.id, raceTarget.id))).json.data;
  const [a, b] = await Promise.all([
    req('POST', crPath(proj.id, raceCr.id, '/approve'), {}),
    req('POST', crPath(proj.id, raceCr.id, '/approve'), {}),
  ]);
  const statuses = [a.status, b.status].sort();
  check('O: concurrent approvals → exactly one 200 and one 409', statuses[0] === 200 && statuses[1] === 409, JSON.stringify(statuses));
  const raceAudits = await prisma.activity.findMany({ where: { projectId: proj.id, action: 'CHANGE_REQUEST_APPROVED', entityId: raceCr.id } });
  check('O: exactly one approval audit for the race winner', raceAudits.length === 1);

  // ——— P. Phase 1–10 behavior intact: authorization paths ———
  console.log('\n—— P. Authorization invariants ——');
  check('P: seeded NovaBank CR-002 still APPROVED', (await prisma.changeRequest.findFirst({ where: { title: { contains: 'CR-002' } } })).status === 'APPROVED');
  check('P: seeded FreshCART CR-102 still REJECTED', (await prisma.changeRequest.findFirst({ where: { title: { contains: 'CR-102' } } })).status === 'REJECTED');
  const clarifications = await prisma.activity.findMany({ where: { projectId: proj.id, action: 'CHANGE_REQUEST_CLARIFICATION_REQUESTED' } });
  check('P: clarification audits recorded for every clarification transition', clarifications.length === 2);
  check('P: commitment cannot be authorized directly via commitments API', (await req('PATCH', `/projects/${proj.id}/commitments/${rollbackTarget.id}`, { authorizationStatus: 'AUTHORIZED' })).status === 400);

  console.log(`\n${results.filter((x) => x.ok).length}/${results.length} checks passed`);
  if (results.some((x) => !x.ok)) process.exitCode = 1;
} catch (err) {
  console.error('Test run crashed:', err);
  process.exitCode = 1;
} finally {
  try {
    if (api) api.kill();
  } catch {
    /* api never spawned */
  }
  // Disconnect every Prisma pool BEFORE pg.stop() — the embedded server
  // drains via smart shutdown and hangs while clients remain connected.
  try {
    if (prisma) await prisma.$disconnect();
  } catch {
    /* prisma never constructed */
  }
  try {
    await failingPrisma.$disconnect();
  } catch {
    /* failingPrisma never constructed */
  }
  try {
    await pg.stop();
  } catch {
    /* already down */
  }
}

// Force-exit: an embedded-postgres child handle can outlive the suite on
// Windows and block a clean exit after the summary has printed.
process.exit(process.exitCode || 0);
