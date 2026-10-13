/**
 * End-to-end Dashboard, Alerts & Audit Intelligence tests (Phase 12):
 * ephemeral PostgreSQL + compiled Nest app + deterministic development AI
 * provider. Covers the dashboard aggregate (GET /projects/:projectId/
 * dashboard — summary/commitments/change-request counts straight from
 * count/groupBy, newest-first recent activity, actionable attention items),
 * the paginated audit endpoint (GET …/activity with action filter and safe
 * sort whitelist), the deterministic alerts endpoint (GET …/alerts), and
 * project isolation across all three. Read-only: no AI calls, no mutations.
 * The real Fireworks API is never called.
 * Usage: node scripts/test-dashboard-api.mjs
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
    name: 'Phase 12 Dashboard Project',
    clientName: 'MetricCorp',
  })).json.data;

  // Two meetings so meeting counts are non-trivial.
  const meeting1 = (await req('POST', `/projects/${proj.id}/meetings`, {
    title: 'Phase 12 Kickoff',
    meetingDate: '2026-10-12T09:00:00Z',
    summary: 'Fixture meeting one.',
  })).json.data;
  const meeting2 = (await req('POST', `/projects/${proj.id}/meetings`, {
    title: 'Phase 12 Review',
    meetingDate: '2026-10-12T10:00:00Z',
    summary: 'Fixture meeting two.',
  })).json.data;

  // Approved scope: authentication + checkout.
  await req('POST', `/projects/${proj.id}/scope`, {
    title: 'User authentication including email/password login',
    description: 'Users sign in with email and password.',
    category: 'Authentication',
    approvalStatus: 'AUTHORIZED',
  });
  await req('POST', `/projects/${proj.id}/scope`, {
    title: 'Checkout with credit card payments',
    description: 'Checkout flow with credit card payments and saved billing addresses.',
    category: 'Checkout',
    approvalStatus: 'AUTHORIZED',
  });

  const mkCommitment = (title, description, meetingId = meeting1.id) =>
    req('POST', `/projects/${proj.id}/commitments`, {
      title,
      description,
      speaker: 'Dana Client',
      meetingId,
    }).then((r) => r.json.data);
  const verify = (c) =>
    req('POST', `/projects/${proj.id}/commitments/${c.id}/verify`);
  const generate = (c) =>
    req('POST', `/projects/${proj.id}/commitments/${c.id}/change-request`);

  const highRisk1 = await mkCommitment('Add Telegram bot alerts for deployments', 'Team promised Telegram alerts when deployments finish.');
  const inScope = await mkCommitment('Add email and password login', 'Promise to support email and password login for all users.');
  const ambiguous = await mkCommitment('Add a credit card wallet pass to checkout', 'Client asked for a wallet pass on the checkout screen.');
  const highRisk2 = await mkCommitment('Add Slack notifications for build failures', 'Team promised Slack pings when builds fail.', meeting2.id);
  const highRisk3 = await mkCommitment('Add webhook push to client ERP', 'Team promised ERP webhooks for order events.', meeting2.id);
  const highRisk4 = await mkCommitment('Add SMS delivery alerts to customers', 'Team promised SMS alerts when orders are delivered.', meeting2.id);

  // Verify everything so risk/authorization persist (Phase 10 semantics).
  for (const c of [highRisk1, inScope, ambiguous, highRisk2, highRisk3, highRisk4]) {
    const r = await verify(c);
    if (r.status !== 201 && r.status !== 200) throw new Error(`verify failed: ${JSON.stringify(r.json)}`);
  }

  // CRs: pending (highRisk1), clarification (highRisk2), approved (highRisk3), rejected (highRisk4).
  const crPending = (await generate(highRisk1)).json.data;
  const crClar = (await generate(highRisk2)).json.data;
  await req('POST', `/projects/${proj.id}/change-requests/${crClar.id}/clarification`, {
    comment: 'Please confirm the Slack workspace owner.',
  });
  const crApproved = (await generate(highRisk3)).json.data;
  await req('POST', `/projects/${proj.id}/change-requests/${crApproved.id}/approve`, {
    reason: 'Client signed the addendum.',
  });
  const crRejected = (await generate(highRisk4)).json.data;
  // Final mutation — the newest activity must be this rejection.
  await req('POST', `/projects/${proj.id}/change-requests/${crRejected.id}/reject`, {
    reason: 'Postponed to next quarter.',
  });

  // Expected state:
  //   commitments: 6 total — 2 AUTHORIZED (inScope, highRisk3-approved),
  //   3 UNAUTHORIZED (highRisk1, highRisk2, highRisk4), 1 PENDING (ambiguous);
  //   risk: 3 HIGH, 1 MEDIUM, 2 LOW.
  //   CRs: 1 pending, 1 clarification_requested, 1 approved, 1 rejected.
  const dbCommitmentCount = await prisma.commitment.count({ where: { projectId: proj.id } });
  const dbActivityCount = await prisma.activity.count({ where: { projectId: proj.id } });

  // ——— A. Dashboard aggregate ——
  console.log('\n—— A. Dashboard ——');
  const dash = await req('GET', `/projects/${proj.id}/dashboard`);
  check('A: dashboard succeeds with envelope', dash.status === 200 && dash.json.success === true && typeof dash.json.message === 'string');
  const d = dash.json.data;
  check('A: project context present', d.project.id === proj.id && d.project.name === 'Phase 12 Dashboard Project');
  check('A: summary counts correct', d.summary.scopeRequirements === 2 && d.summary.meetings === 2 && d.summary.commitments === 6, JSON.stringify(d.summary));
  check('A: unauthorized/high-risk counts correct', d.summary.unauthorizedCommitments === 3 && d.summary.highRiskCommitments === 3);
  check('A: change request summary correct', d.summary.pendingChangeRequests === 2 && d.summary.approvedChangeRequests === 1 && d.summary.rejectedChangeRequests === 1);
  check('A: commitment breakdown correct', d.commitments.total === dbCommitmentCount && d.commitments.authorized === 2 && d.commitments.unauthorized === 3 && d.commitments.pending === 1 && d.commitments.highRisk === 3 && d.commitments.mediumRisk === 1 && d.commitments.lowRisk === 2, JSON.stringify(d.commitments));
  check('A: change request breakdown correct', d.changeRequests.pending === 1 && d.changeRequests.clarificationRequested === 1 && d.changeRequests.approved === 1 && d.changeRequests.rejected === 1, JSON.stringify(d.changeRequests));
  check('A: recentActivity newest-first and bounded', Array.isArray(d.recentActivity) && d.recentActivity.length <= 25 && d.recentActivity.every((x, i, arr) => i === 0 || arr[i - 1].createdAt >= x.createdAt));
  check('A: newest activity is the rejection audit', d.recentActivity[0]?.action === 'CHANGE_REQUEST_REJECTED', JSON.stringify(d.recentActivity[0]));
  check('A: recent activity carries entity context for navigation', d.recentActivity[0].changeRequestId === crRejected.id && d.recentActivity[0].commitmentId === highRisk4.id && d.recentActivity[0].meetingId === meeting2.id, JSON.stringify(d.recentActivity[0]));
  check('A: dashboard contains all four attention categories', d.attentionItems.filter((x) => x.type === 'UNAUTHORIZED_COMMITMENT').length === 3 && d.attentionItems.filter((x) => x.type === 'AMBIGUOUS_VERIFICATION').length === 1 && d.attentionItems.filter((x) => x.type === 'PENDING_CHANGE_REQUEST').length === 1 && d.attentionItems.filter((x) => x.type === 'CLARIFICATION_REQUESTED').length === 1, JSON.stringify(d.attentionItems.map((x) => x.type)));
  check('A: attention items are navigation-ready', d.attentionItems.every((x) => x.title && x.severity && (x.commitmentId || x.changeRequestId)));

  // ——— B. Activity / audit endpoint ——
  console.log('\n—— B. Activity ——');
  const act = await req('GET', `/projects/${proj.id}/activity`);
  check('B: activity endpoint succeeds (default pagination)', act.status === 200 && act.json.data.items.length === 10 && act.json.data.page === 1 && act.json.data.totalItems === dbActivityCount, JSON.stringify({ got: act.json.data?.items?.length, total: act.json.data?.totalItems, db: dbActivityCount }));
  check('B: activity newest-first', act.json.data.items.every((x, i, arr) => i === 0 || arr[i - 1].createdAt >= x.createdAt));

  const page2 = await req('GET', `/projects/${proj.id}/activity?page=2&limit=5`);
  check('B: pagination works (page 2, limit 5)', page2.status === 200 && page2.json.data.items.length === 5 && page2.json.data.page === 2 && page2.json.data.totalPages === Math.ceil(dbActivityCount / 5));
  const p1 = (await req('GET', `/projects/${proj.id}/activity?page=1&limit=5`)).json.data.items;
  check('B: pages do not overlap', page2.json.data.items.every((x) => !p1.some((y) => y.id === x.id)));

  const filtered = await req('GET', `/projects/${proj.id}/activity?action=COMMITMENT_VERIFIED&limit=100`);
  const dbVerified = await prisma.activity.count({ where: { projectId: proj.id, action: 'COMMITMENT_VERIFIED' } });
  check('B: action filter works', filtered.status === 200 && filtered.json.data.items.length === dbVerified && filtered.json.data.items.every((x) => x.action === 'COMMITMENT_VERIFIED'), JSON.stringify({ got: filtered.json.data?.items?.length, db: dbVerified }));

  const sortedAsc = await req('GET', `/projects/${proj.id}/activity?sortBy=createdAt&sortOrder=asc&limit=100`);
  const ascStamps = sortedAsc.json.data.items.map((x) => x.createdAt);
  check('B: sorting by createdAt asc works', sortedAsc.status === 200 && ascStamps.every((t, i) => i === 0 || ascStamps[i - 1] <= t), JSON.stringify(ascStamps.slice(0, 8)));
  check('B: sortBy=action rejected (enum-ordinal order is not meaningful)', (await req('GET', `/projects/${proj.id}/activity?sortBy=action`)).status === 400);

  // ——— C. Alerts ——
  console.log('\n—— C. Alerts ——');
  const alerts = await req('GET', `/projects/${proj.id}/alerts`);
  check('C: alerts endpoint succeeds', alerts.status === 200 && alerts.json.success === true);
  const al = alerts.json.data;
  check('C: high-risk unauthorized commitment alert', al.filter((x) => x.type === 'UNAUTHORIZED_COMMITMENT').length === 3 && al.every((x) => x.type !== 'UNAUTHORIZED_COMMITMENT' || (x.severity === 'HIGH' && x.commitmentId && !x.changeRequestId)));
  check('C: pending change request alert', al.some((x) => x.type === 'PENDING_CHANGE_REQUEST' && x.changeRequestId === crPending.id && x.commitmentId === highRisk1.id));
  check('C: clarification alert', al.some((x) => x.type === 'CLARIFICATION_REQUESTED' && x.changeRequestId === crClar.id));
  check('C: ambiguous verification alert (MEDIUM/PENDING commitment)', al.some((x) => x.type === 'AMBIGUOUS_VERIFICATION' && x.commitmentId === ambiguous.id));
  check('C: approved/rejected CRs produce no alerts', !al.some((x) => x.changeRequestId === crApproved.id || x.changeRequestId === crRejected.id));
  check('C: alert shape complete', al.every((x) => x.id && x.type && x.severity && typeof x.title === 'string' && typeof x.description === 'string' && 'commitmentId' in x && 'meetingId' in x && x.createdAt));

  // ——— D. Empty state ——
  console.log('\n—— D. Empty state ——');
  const empty = (await req('POST', '/projects', { name: 'Phase 12 Empty Project', clientName: 'BlankCorp' })).json.data;
  const emptyDash = (await req('GET', `/projects/${empty.id}/dashboard`)).json.data;
  const emptyAlerts = (await req('GET', `/projects/${empty.id}/alerts`)).json.data;
  check('D: fresh project dashboard zeros + empty attention', emptyDash.summary.scopeRequirements === 0 && emptyDash.summary.commitments === 0 && emptyDash.summary.pendingChangeRequests === 0 && emptyDash.attentionItems.length === 0);
  check('D: fresh project alerts return empty array successfully', emptyAlerts.length === 0 && Array.isArray(emptyAlerts));
  check('D: fresh project still records PROJECT_CREATED activity', emptyDash.recentActivity.some((x) => x.action === 'PROJECT_CREATED'));

  // ——— E. Project isolation & validation ——
  console.log('\n—— E. Isolation ——');
  const aIds = new Set([highRisk1.id, highRisk2.id, highRisk3.id, highRisk4.id, ambiguous.id, inScope.id, crPending.id, crClar.id, crApproved.id, crRejected.id, meeting1.id, meeting2.id, proj.id]);
  const bDash = (await req('GET', `/projects/${empty.id}/dashboard`)).json.data;
  const bAct = (await req('GET', `/projects/${empty.id}/activity?limit=100`)).json.data;
  const bAlerts = (await req('GET', `/projects/${empty.id}/alerts`)).json.data;
  const leaked = (payload) => JSON.stringify(payload).replace(/\\/g, '').match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g)?.filter((id) => aIds.has(id)) ?? [];
  check('E: project B dashboard leaks nothing from project A', leaked(bDash).length === 0, JSON.stringify(leaked(bDash)));
  check('E: project B activity leaks nothing from project A', bAct.items.every((x) => !aIds.has(x.id)) && bAct.items.every((x) => x.projectId === empty.id));
  check('E: project B alerts leak nothing from project A', bAlerts.length === 0);

  const missing = '11111111-1111-4111-8111-111111111111';
  check('E: unknown project dashboard → 404', (await req('GET', `/projects/${missing}/dashboard`)).status === 404);
  check('E: unknown project activity → 404', (await req('GET', `/projects/${missing}/activity`)).status === 404);
  check('E: unknown project alerts → 404', (await req('GET', `/projects/${missing}/alerts`)).status === 404);
  check('E: non-UUID project → 400', (await req('GET', '/projects/not-a-uuid/dashboard')).status === 400);
  check('E: non-whitelisted sortBy → 400', (await req('GET', `/projects/${proj.id}/activity?sortBy=riskLevel`)).status === 400);
  check('E: unknown action filter → 400', (await req('GET', `/projects/${proj.id}/activity?action=NOT_AN_ACTION`)).status === 400);
  check('E: invalid page → 400', (await req('GET', `/projects/${proj.id}/activity?page=0`)).status === 400);

  // Read-only guarantee: no new activities were created by any dashboard call.
  const activityAfter = await prisma.activity.count({ where: { projectId: proj.id } });
  check('E: dashboard/activity/alerts endpoints are read-only', activityAfter === dbActivityCount);

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
    await pg.stop();
  } catch {
    /* already down */
  }
}

// Force-exit: an embedded-postgres child handle can outlive the suite on
// Windows and block a clean exit after the summary has printed.
process.exit(process.exitCode || 0);
