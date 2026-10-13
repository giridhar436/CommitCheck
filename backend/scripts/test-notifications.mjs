/**
 * Phase 15 notification tests (dev-only), two layers:
 *
 * 1. Unit/orchestration — NotificationsService + both providers against a
 *    fake Prisma and stubbed fetch: provider selection, dedup (unique
 *    eventKey claim), failure isolation (notify NEVER throws; FAILED rows
 *    carry sanitized errors), Resend request shape, no secret leakage.
 *
 * 2. End-to-end — boots an ephemeral PostgreSQL + stub Supabase + the
 *    compiled Nest app, drives a real verification to HIGH+UNAUTHORIZED and
 *    a change-request generation, then inspects notification_log rows
 *    directly: right recipients, SENT status, no duplicates on re-verify.
 *
 * Usage: node scripts/test-notifications.mjs
 */
import EmbeddedPostgres from 'embedded-postgres';
import { spawn, execSync } from 'node:child_process';
import { createServer } from 'node:http';
import pg from 'pg';
import { Prisma, NotificationStatus } from '@prisma/client';
import { signToken, TEST_JWT_SECRET, USER_A, USER_D } from './lib/auth-helper.mjs';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? '✅' : '❌'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
}

const {
  NotificationsService,
} = await import('../dist/notifications/notifications.service.js').then((m) => ({ NotificationsService: m.NotificationsService ?? m.default.NotificationsService }));
const { LogNotificationProvider } = await import('../dist/notifications/log-notification.provider.js');
const { ResendEmailProvider } = await import('../dist/notifications/resend-email.provider.js');

const EMAIL_D = 'member-d@commitcheck.test';
const FAKE_KEY = 're_test_fake_api_key_not_a_secret';
const PG_PORT = 5437;
const API_PORT = 3107;
const STUB_PORT = 3202;
const BASE = `http://localhost:${API_PORT}/api`;
const DB = 'commitcheck';

function fakePrisma() {
  const rows = [];
  return {
    rows,
    notificationLog: {
      create: async ({ data }) => {
        if (rows.some((r) => r.eventKey === data.eventKey)) {
          throw new Prisma.PrismaClientKnownRequestError('dup', {
            code: 'P2002',
            clientVersion: 'test',
          });
        }
        const row = { id: `row-${rows.length + 1}`, ...data };
        rows.push(row);
        return row;
      },
      update: async ({ where, data }) => {
        const row = rows.find((r) => r.id === where.id);
        Object.assign(row, data);
        return row;
      },
    },
    projectMember: {
      // Models a role-filtered query result: OWNER + ADMIN memberships only
      // (the real query filters role in (ADMIN, OWNER) at the database).
      findMany: async () => [
        { userId: USER_A, email: 'rahul@pixelforge.io' },
        { userId: USER_D, email: EMAIL_D },
      ],
    },
    project: {
      findUnique: async () => ({ ownerUserId: USER_A }),
    },
  };
}

const APPROVERS = [
  { userId: USER_A, email: 'rahul@pixelforge.io' },
  { userId: USER_D, email: EMAIL_D },
];

// ——— 1a. provider selection & log provider ———
console.log('\n——— provider selection (no email config) ———');
delete process.env.RESEND_API_KEY;
delete process.env.RESEND_FROM;

let svc = new NotificationsService(fakePrisma());
check('P1 without config → log provider, emailConfigured false', svc.status.provider === 'log' && svc.status.emailConfigured === false, JSON.stringify(svc.status));
check('P2 log provider name + send resolves', new LogNotificationProvider().name === 'log' && (await new LogNotificationProvider().send({ to: null, toUserId: 'u', subject: 's', body: 'b' })) === undefined);

{
  const fp = fakePrisma();
  svc = new NotificationsService(fp);
  const out = await svc.notify({
    eventKey: 'evt:1',
    type: 'test.event',
    projectId: 'p1',
    recipients: APPROVERS,
    subject: 'Hello',
    body: 'World',
  });
  check('P3 notify → SENT for each recipient', out.every((o) => o === 'SENT') && out.length === 2, JSON.stringify(out));
  check('P4 rows PENDING → SENT with provider log', fp.rows.every((r) => r.status === 'SENT' && r.provider === 'log'), JSON.stringify(fp.rows.map((r) => r.status)));
  const out2 = await svc.notify({
    eventKey: 'evt:1',
    type: 'test.event',
    projectId: 'p1',
    recipients: APPROVERS,
    subject: 'Hello',
    body: 'World',
  });
  check('P5 same event again → SKIPPED (no duplicates)', out2.every((o) => o === 'SKIPPED') && fp.rows.length === 2, JSON.stringify(out2));
  const out3 = await svc.notify({ eventKey: 'evt:2', type: 't', projectId: 'p1', recipients: [], subject: 's', body: 'b' });
  check('P6 empty recipients → SKIPPED', out3.length === 1 && out3[0] === 'SKIPPED');
}

// ——— 1b. Resend provider ———
console.log('\n——— Resend email provider ———');
check('P7 fromEnv without key/from → null', ResendEmailProvider.fromEnv() === null);

process.env.RESEND_API_KEY = FAKE_KEY;
process.env.RESEND_FROM = 'CommitCheck <noreply@commitcheck.test>';
const resend = ResendEmailProvider.fromEnv();
check('P8 fromEnv with both → provider named resend-email', resend !== null && resend.name === 'resend-email');

let lastFetch;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  lastFetch = { url, init };
  return { ok: true, status: 200, json: async () => ({ id: 'email_1' }) };
};
await resend.send({ to: 'a@b.c', toUserId: USER_A, subject: 'S1', body: 'B1' });
check('P9 send posts to api.resend.com/emails', lastFetch.url === 'https://api.resend.com/emails');
check('P10 Bearer header carries the key (never logged elsewhere)', lastFetch.init.headers.Authorization === `Bearer ${FAKE_KEY}`);
const payload = JSON.parse(lastFetch.init.body);
check('P11 payload shape from/to/subject/text', payload.from.includes('noreply@commitcheck.test') && payload.to[0] === 'a@b.c' && payload.subject === 'S1' && payload.text === 'B1');

// Orchestrated: SENT through the real Resend path
{
  const fp = fakePrisma();
  svc = new NotificationsService(fp);
  const out = await svc.notify({
    eventKey: 'evt:r1',
    type: 'test.email',
    projectId: 'p1',
    recipients: APPROVERS,
    subject: 'S',
    body: 'B',
  });
  check('P12 Resend path → SENT rows', out.every((o) => o === 'SENT') && fp.rows.every((r) => r.status === 'SENT' && r.provider === 'resend-email'), JSON.stringify(out));

  // Provider failure → FAILED row with sanitized error; notify still resolves.
  globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
  const outFail = await svc.notify({
    eventKey: 'evt:r2',
    type: 'test.email',
    projectId: 'p1',
    recipients: APPROVERS,
    subject: 'S',
    body: 'B',
  });
  const failedRows = fp.rows.filter((r) => r.eventKey.startsWith('evt:r2'));
  check('P13 provider 500 → FAILED, never throws', outFail.every((o) => o === 'FAILED') && failedRows.every((r) => r.status === 'FAILED'), JSON.stringify(outFail));
  const errorBlob = JSON.stringify(failedRows.map((r) => r.error));
  check('P14 failure error sanitized (no key, status only)', !errorBlob.includes(FAKE_KEY) && errorBlob.includes('status 500'), errorBlob);

  // Recipient without an email on file → honest FAILED row.
  const outNoEmail = await svc.notify({
    eventKey: 'evt:r3',
    type: 'test.email',
    projectId: 'p1',
    recipients: [{ userId: 'legacy-owner', email: null }],
    subject: 'S',
    body: 'B',
  });
  const noEmailRow = fp.rows.find((r) => r.eventKey.startsWith('evt:r3'));
  check('P15 recipient without email → FAILED "no email address on file"', outNoEmail[0] === 'FAILED' && noEmailRow.error.includes('no email address on file'));
}

// Restore the real fetch — the E2E section below talks to actual sockets.
globalThis.fetch = realFetch;

// ——— 1c. resolveApprovers ———
{
  const fp = fakePrisma();
  svc = new NotificationsService(fp);
  const refs = await svc.resolveApprovers('p1');
  check(
    'P16 approvers deduped with owner membership (OWNER+ADMIN rows)',
    refs.length === 2 && refs.every((r) => [USER_A, USER_D].includes(r.userId)),
    JSON.stringify(refs),
  );
}
{
  // Legacy project: the owner has NO membership row — still included.
  const fp = fakePrisma();
  fp.projectMember.findMany = async () => [{ userId: USER_D, email: EMAIL_D }];
  svc = new NotificationsService(fp);
  const refs = await svc.resolveApprovers('p1');
  check(
    'P17 legacy ownerUserId (no membership) included with null email',
    refs.length === 2 && refs.some((r) => r.userId === USER_A && r.email === null) && refs.some((r) => r.userId === USER_D),
    JSON.stringify(refs),
  );
}
delete process.env.RESEND_API_KEY;
delete process.env.RESEND_FROM;

// ——— 2. end-to-end: real verify/CR flows write real notification rows ———
console.log('\n——— end-to-end notification rows ———');
const stub = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/auth/v1/admin/users') {
    const page = Number(url.searchParams.get('page') ?? '1');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ users: page <= 1 ? [{ id: USER_D, email: EMAIL_D }] : [] }));
    return;
  }
  res.writeHead(404).end('{}');
});

const env = {
  ...process.env,
  DATABASE_URL: `postgresql://postgres:postgres@localhost:${PG_PORT}/${DB}`,
  DIRECT_URL: `postgresql://postgres:postgres@localhost:${PG_PORT}/${DB}`,
  PORT: String(API_PORT),
  SUPABASE_JWT_SECRET: TEST_JWT_SECRET,
  SUPABASE_URL: `http://localhost:${STUB_PORT}`,
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key-not-a-secret',
  EMBEDDING_PROVIDER: '',
  // RESEND_* deliberately unset — the app must degrade to the log provider.
};

const tokenA = await signToken(USER_A, 'rahul@pixelforge.io');
const tokenD = await signToken(USER_D, EMAIL_D);
const req = async (method, path, body, token = tokenA) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
};

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
const pgx = new EmbeddedPostgres({
  databaseDir: './.verify-pg-data',
  user: 'postgres',
  password: 'postgres',
  port: PG_PORT,
  persistent: false,
});

async function logRows(client, where) {
  const { rows } = await client.query(
    `SELECT event_key, type, provider, status, error, recipient_user_id, recipient_email
     FROM notification_log WHERE type = $1 ORDER BY created_at`,
    [where],
  );
  return rows;
}

try {
  await new Promise((r) => stub.listen(STUB_PORT, r));
  await pgx.initialise();
  await pgx.start();
  await pgx.createDatabase(DB);
  execSync('npx prisma migrate deploy', { env, stdio: 'inherit' });
  execSync('npm run db:seed', { env, stdio: 'inherit' });

  api = spawn('node', ['dist/main.js'], { env, stdio: 'pipe' });
  api.stderr.on('data', (d) => process.stderr.write(d));
  await waitReady();

  const project = (await req('POST', '/projects', { name: 'Notif Flow', clientName: 'N' })).json.data;
  const meeting = (await req('POST', `/projects/${project.id}/meetings`, { title: 'M1', meetingDate: '2026-10-13T10:00:00Z' })).json.data;

  // Add an ADMIN so approver fan-out covers two recipients.
  await req('POST', `/projects/${project.id}/members`, { email: EMAIL_D, role: 'ADMIN' });

  const mkCommitment = async (title) =>
    (
      await req('POST', `/projects/${project.id}/commitments`, {
        title,
        description: `Unscoped gibberish ${title} zeta-quanta`,
        speaker: 'Dana',
        meetingId: meeting.id,
      })
    ).json.data;

  const c1 = await mkCommitment('Unscoped thing one');
  await req('POST', `/projects/${project.id}/commitments/${c1.id}/verify`);

  const client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();

  let rows = await logRows(client, 'verification.high_risk_unauthorized');
  check(
    'E1 HIGH+UNAUTHORIZED verify → one row per approver (2)',
    rows.length === 2 && rows.every((r) => r.status === 'SENT' && r.provider === 'log'),
    JSON.stringify(rows.map((r) => [r.recipient_user_id, r.status])),
  );
  check(
    'E2 rows address owner + admin with emails',
    rows.some((r) => r.recipient_user_id === USER_A && r.recipient_email === 'rahul@pixelforge.io') &&
      rows.some((r) => r.recipient_user_id === USER_D),
  );

  // Re-verify the same commitment: state unchanged → no duplicate alerts.
  await req('POST', `/projects/${project.id}/commitments/${c1.id}/verify`);
  rows = await logRows(client, 'verification.high_risk_unauthorized');
  check('E3 re-verify (unchanged) → no duplicate notifications', rows.length === 2, `got ${rows.length}`);

  // A second commitment escalates → new event → new rows (2 more).
  const c2 = await mkCommitment('Unscoped thing two');
  await req('POST', `/projects/${project.id}/commitments/${c2.id}/verify`);
  rows = await logRows(client, 'verification.high_risk_unauthorized');
  check('E4 second high-risk commitment → 2 new rows (4 total)', rows.length === 4, `got ${rows.length}`);

  // CR lifecycle notifications.
  await req('POST', `/projects/${project.id}/commitments/${c1.id}/change-request`);
  rows = await logRows(client, 'change_request.created');
  check('E5 CR generation → created rows per approver', rows.length === 2 && rows.every((r) => r.status === 'SENT'));

  const cr = (await req('GET', `/projects/${project.id}/change-requests`)).json.data.items[0];
  await req('POST', `/projects/${project.id}/change-requests/${cr.id}/approve`, {}, tokenD);
  rows = await logRows(client, 'change_request.approved');
  check('E6 CR approval → approved rows, exactly once', rows.length === 2, `got ${rows.length}`);
  await req('POST', `/projects/${project.id}/change-requests/${cr.id}/approve`, {}, tokenD).catch(() => null);
  const approvedAgain = await logRows(client, 'change_request.approved');
  check('E7 duplicate approval event deduped', approvedAgain.length === 2, `got ${approvedAgain.length}`);

  const blob = JSON.stringify((await client.query('SELECT * FROM notification_log')).rows);
  check('E8 notification rows carry no secrets', !blob.includes(TEST_JWT_SECRET) && !blob.includes('service-role'), '');

  await client.end();

  const failed = results.filter((x) => !x.ok);
  console.log(`\n—— ${results.length - failed.length}/${results.length} checks passed ——`);
  if (failed.length > 0) process.exitCode = 1;
} finally {
  api?.kill();
  stub.close();
  try {
    await pgx.stop();
  } catch {
    /* already stopped */
  }
  console.log('Ephemeral PostgreSQL stopped.');
}

// Force-exit: an embedded-postgres child handle can outlive the suite on
// Windows and block a clean exit after the summary has printed.
process.exit(process.exitCode || 0);
