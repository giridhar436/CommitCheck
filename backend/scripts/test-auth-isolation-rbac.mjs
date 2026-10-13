/**
 * Phase 15 end-to-end tests: authentication, project isolation, RBAC.
 *
 * Boots an ephemeral PostgreSQL, a stub Supabase Auth admin API, and the
 * compiled Nest app, then proves:
 *   A. Authentication — 401 for missing/invalid/expired/wrong-secret tokens,
 *      identity via /auth/me, no sensitive detail leaks, 413 preserved.
 *   B. Isolation — a non-member gets 404 (never 200/403-that-leaks) on
 *      EVERY resource family of another user's project, reads and writes.
 *   C. RBAC — VIEWER/MEMBER/ADMIN/OWNER capabilities, scope-approval
 *      admin gating, self-role-change blocked, owner protections.
 *   D. Security misc — invalid UUIDs, unexpected fields, no stack traces,
 *      no secret leakage.
 *   E. Legacy owner fallback — ownerUserId without a membership row keeps
 *      access; non-members still get 404.
 * Usage: node scripts/test-auth-isolation-rbac.mjs
 */
import EmbeddedPostgres from 'embedded-postgres';
import { spawn, execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { SignJWT } from 'jose';
import pg from 'pg';
import { signToken, TEST_JWT_SECRET, USER_A, USER_B, USER_C, USER_D } from './lib/auth-helper.mjs';

const PG_PORT = 5436;
const API_PORT = 3106;
const STUB_PORT = 3201;
const BASE = `http://localhost:${API_PORT}/api`;
const DB = 'commitcheck';
const SECRET_MARKER = TEST_JWT_SECRET; // must never appear in any response

const EMAIL_B = 'member-b@commitcheck.test';
const EMAIL_C = 'member-c@commitcheck.test';
const EMAIL_D = 'member-d@commitcheck.test';

// Stub Supabase Auth admin directory: resolves the three test members by email.
const STUB_USERS = [
  { id: USER_B, email: EMAIL_B },
  { id: USER_C, email: EMAIL_C },
  { id: USER_D, email: EMAIL_D },
];

const stub = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${STUB_PORT}`);
  if (url.pathname === '/auth/v1/admin/users') {
    const page = Number(url.searchParams.get('page') ?? '1');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ users: page <= 1 ? STUB_USERS : [] }));
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
};

// ——— tiny assertion harness ———
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? '✅' : '❌'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
}

/** req with an explicit token (null → no Authorization header at all). */
async function reqAs(method, path, body, token, extra = {}) {
  const headers = {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

const tokenA = await signToken(USER_A, 'rahul@pixelforge.io');
const tokenB = await signToken(USER_B, EMAIL_B);
const tokenC = await signToken(USER_C, EMAIL_C);
const tokenD = await signToken(USER_D, EMAIL_D);
const req = (m, p, b) => reqAs(m, p, b, tokenA);

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

try {
  console.log('Starting ephemeral PostgreSQL + stub Supabase + API…');
  await new Promise((r) => stub.listen(STUB_PORT, r));
  await pgx.initialise();
  await pgx.start();
  await pgx.createDatabase(DB);
  execSync('npx prisma migrate deploy', { env, stdio: 'inherit' });
  execSync('npm run db:seed', { env, stdio: 'inherit' });

  api = spawn('node', ['dist/main.js'], { env, stdio: 'pipe' });
  api.stderr.on('data', (d) => process.stderr.write(d));
  await waitReady();

  const novaId = (await req('GET', '/projects?search=novabank')).json.data.items[0].id;
  const novaMeeting = (await req('GET', `/projects/${novaId}/meetings`)).json.data.items[0];
  const novaCommitment = (await req('GET', `/projects/${novaId}/commitments`)).json.data.items[0];
  const novaCr = (await req('GET', `/projects/${novaId}/change-requests`)).json.data.items[0];
  const novaDoc = (await req('GET', `/projects/${novaId}/documents`)).json.data.items[0];
  const novaRequirement = (await req('GET', `/projects/${novaId}/scope`)).json.data.items[0];

  // ——— A. Authentication ———
  console.log('\n——— A. authentication ———');

  let r = await reqAs('GET', '/projects', null, null);
  check('A1 no token → 401 "Authentication required"', r.status === 401 && r.json.message === 'Authentication required', JSON.stringify(r.json));

  r = await reqAs('GET', '/projects', null, 'garbage.token.here');
  check('A2 malformed token → 401 "Invalid or expired token"', r.status === 401 && r.json.message === 'Invalid or expired token');

  const expired = await signToken(USER_A, 'rahul@pixelforge.io', { expiresIn: '-600s' });
  r = await reqAs('GET', '/projects', null, expired);
  check('A3 expired token → 401', r.status === 401 && r.json.message === 'Invalid or expired token');

  const wrongSecret = await new SignJWT({ email: 'x@x.io' })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(USER_A).setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode('some-other-signing-secret'));
  r = await reqAs('GET', '/projects', null, wrongSecret);
  check('A4 token signed with wrong secret → 401', r.status === 401 && r.json.message === 'Invalid or expired token');

  const badSub = await new SignJWT({ email: 'x@x.io' })
    .setProtectedHeader({ alg: 'HS256' }).setSubject('not-a-uuid').setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(TEST_JWT_SECRET));
  r = await reqAs('GET', '/projects', null, badSub);
  check('A5 non-UUID sub → 401 (never reaches DB)', r.status === 401 && r.json.message === 'Invalid or expired token');

  r = await req('GET', '/auth/me');
  check('A6 /auth/me → 200 with id + email', r.status === 200 && r.json.data.id === USER_A && r.json.data.email === 'rahul@pixelforge.io', JSON.stringify(r.json));

  r = await reqAs('GET', '/auth/me', null, null);
  check('A7 /auth/me without token → 401', r.status === 401);

  const leakScan = JSON.stringify([
    await reqAs('GET', '/projects', null, null),
    await reqAs('GET', '/projects', null, 'garbage.token.here'),
    await reqAs('GET', `/projects/${novaId}`, null, tokenB),
  ]);
  check('A8 auth failures leak no secrets/stack/paths', !leakScan.includes(SECRET_MARKER) && !leakScan.includes('service-role') && !/at [A-Z][A-Za-z]+ \(|\\src\\/.test(leakScan), leakScan.slice(0, 120));

  // ——— B. Isolation (USER_B has no memberships yet) ———
  console.log('\n——— B. cross-project isolation ———');

  r = await reqAs('GET', '/projects', null, tokenB);
  check('B1 USER_B list → 0 projects (sees nothing)', r.status === 200 && r.json.data.totalItems === 0, JSON.stringify(r.json.data?.totalItems));

  const family = [
    ['GET', `/projects/${novaId}`, 'project detail'],
    ['PATCH', `/projects/${novaId}`, 'project update'],
    ['DELETE', `/projects/${novaId}`, 'project delete'],
    ['GET', `/projects/${novaId}/meetings`, 'meetings list'],
    ['POST', `/projects/${novaId}/meetings`, 'meeting create'],
    ['GET', `/projects/${novaId}/scope`, 'scope list'],
    ['POST', `/projects/${novaId}/scope`, 'scope create'],
    ['GET', `/projects/${novaId}/commitments`, 'commitments list'],
    ['GET', `/projects/${novaId}/documents`, 'documents list'],
    ['GET', `/projects/${novaId}/change-requests`, 'CR list'],
    ['GET', `/projects/${novaId}/dashboard`, 'dashboard'],
    ['GET', `/projects/${novaId}/activity`, 'activity'],
    ['GET', `/projects/${novaId}/alerts`, 'alerts'],
    ['GET', `/projects/${novaId}/retrieval/scope?query=x`, 'retrieval'],
    ['GET', `/projects/${novaId}/members`, 'members list'],
  ];
  let isolation404 = true;
  for (const [method, path] of family) {
    const res = await reqAs(method, path, method === 'GET' ? undefined : {}, tokenB);
    if (res.status !== 404) {
      isolation404 = false;
      check(`B2 ${method} ${path} → 404`, false, `got ${res.status} ${JSON.stringify(res.json).slice(0, 120)}`);
    }
  }
  check(`B2 all ${family.length} project routes → 404 for non-member (no existence leak)`, isolation404);

  // Child resources reached via their OWN ids must also 404 for non-members.
  const childPaths = [
    `/projects/${novaId}/meetings/${novaMeeting.id}`,
    `/projects/${novaId}/commitments/${novaCommitment.id}`,
    `/projects/${novaId}/documents/${novaDoc.id}`,
    `/projects/${novaId}/change-requests/${novaCr.id}`,
    `/projects/${novaId}/scope/${novaRequirement.id}`,
    `/projects/${novaId}/meetings/${novaMeeting.id}/attachments`,
    `/projects/${novaId}/commitments/${novaCommitment.id}/evidence`,
    `/projects/${novaId}/meetings/${novaMeeting.id}/analyze`,
    `/projects/${novaId}/commitments/${novaCommitment.id}/verify`,
  ];
  let child404 = true;
  for (const path of childPaths) {
    const res = await reqAs('GET', path, undefined, tokenB);
    if (res.status !== 404) {
      child404 = false;
      check(`B3 GET ${path} → 404`, false, `got ${res.status}`);
    }
  }
  check(`B3 all ${childPaths.length} child-resource routes → 404 for non-member (no IDOR)`, child404);

  // A child id placed under a DIFFERENT project id must not resolve either.
  const otherProject = (await reqAs('POST', '/projects', { name: 'B Solo', clientName: 'B Client' }, tokenB)).json.data;
  r = await reqAs('GET', `/projects/${otherProject.id}/commitments/${novaCommitment.id}`, undefined, tokenB);
  check('B4 foreign child id under own project → 404', r.status === 404, `got ${r.status}`);

  // ——— C. RBAC ———
  console.log('\n——— C. RBAC ———');

  r = await req('POST', `/projects/${novaId}/members`, { email: EMAIL_B, role: 'MEMBER' });
  check('C1 owner adds MEMBER via email → 201', r.status === 201 && r.json.data.userId === USER_B && r.json.data.email === EMAIL_B, JSON.stringify(r.json));
  r = await req('POST', `/projects/${novaId}/members`, { email: EMAIL_C, role: 'VIEWER' });
  check('C2 owner adds VIEWER → 201', r.status === 201 && r.json.data.role === 'VIEWER');
  r = await req('POST', `/projects/${novaId}/members`, { email: EMAIL_D, role: 'ADMIN' });
  check('C3 owner adds ADMIN → 201', r.status === 201 && r.json.data.role === 'ADMIN');

  r = await req('POST', `/projects/${novaId}/members`, { email: EMAIL_B, role: 'MEMBER' });
  check('C4 duplicate member → 409', r.status === 409, `got ${r.status}`);
  r = await req('POST', `/projects/${novaId}/members`, { email: 'ghost@nowhere.test', role: 'MEMBER' });
  check('C5 unknown Supabase email → 404', r.status === 404, `got ${r.status}`);
  r = await req('POST', `/projects/${novaId}/members`, { email: EMAIL_B, role: 'OWNER' });
  check('C6 adding another OWNER → 400', r.status === 400, `got ${r.status}`);

  r = await reqAs('GET', `/projects/${novaId}`, null, tokenB);
  check('C7 member detail exposes myRole=MEMBER', r.status === 200 && r.json.data.myRole === 'MEMBER', JSON.stringify(r.json.data?.myRole));
  r = await reqAs('GET', `/projects/${novaId}`, null, tokenC);
  check('C8 viewer detail exposes myRole=VIEWER', r.status === 200 && r.json.data.myRole === 'VIEWER');

  // VIEWER: read yes, write no (403, not 404 — authenticated but unauthorized)
  r = await reqAs('GET', `/projects/${novaId}/meetings`, null, tokenC);
  check('C9 VIEWER can read', r.status === 200);
  r = await reqAs('POST', `/projects/${novaId}/meetings`, { title: 'C meeting', meetingDate: '2026-10-13T10:00:00Z' }, tokenC);
  check('C10 VIEWER create → 403', r.status === 403, `got ${r.status}`);
  r = await reqAs('POST', `/projects/${novaId}/commitments/${novaCommitment.id}/verify`, {}, tokenC);
  check('C11 VIEWER verify → 403', r.status === 403, `got ${r.status}`);
  r = await reqAs('POST', `/projects/${novaId}/change-requests/${novaCr.id}/approve`, {}, tokenC);
  check('C12 VIEWER approve → 403', r.status === 403, `got ${r.status}`);

  // MEMBER: writes yes, approvals no, scope-approval definitely no
  r = await reqAs('POST', `/projects/${novaId}/meetings`, { title: 'B meeting', meetingDate: '2026-10-13T10:00:00Z' }, tokenB);
  check('C13 MEMBER create meeting → 201', r.status === 201, `got ${r.status} ${JSON.stringify(r.json)}`);
  const bMeeting = r.json.data;

  // MEMBER builds a full out-of-scope chain: commitment → HIGH verdict → CR.
  r = await reqAs('POST', `/projects/${novaId}/commitments`, {
    title: 'B quantum widgets unbounded',
    description: 'Completely unscoped zeta-quanta widget integration promise',
    speaker: 'B',
    meetingId: bMeeting.id,
  }, tokenB);
  check('C13b MEMBER create commitment → 201', r.status === 201, `got ${r.status}`);
  const bCommitment = r.json.data;
  r = await reqAs('POST', `/projects/${novaId}/commitments/${bCommitment.id}/verify`, {}, tokenB);
  check('C13c MEMBER verify → 200 HIGH/UNAUTHORIZED', r.status === 200 && r.json.data.risk === 'HIGH' && r.json.data.authorizationStatus === 'UNAUTHORIZED', JSON.stringify(r.json.data?.risk));
  r = await reqAs('POST', `/projects/${novaId}/commitments/${bCommitment.id}/change-request`, {}, tokenB);
  check('C13d MEMBER generate CR → 201 (write)', r.status === 201 && r.json.data.status === 'PENDING', `got ${r.status}`);
  const crB = r.json.data;

  r = await reqAs('POST', `/projects/${novaId}/scope`, { title: 'B requirement', description: 'B-authored', category: 'FEATURE' }, tokenB);
  check('C14 MEMBER create PENDING requirement → 201', r.status === 201 && r.json.data.approvalStatus === 'PENDING', `got ${r.status}`);
  const bReqId = r.json.data?.id;
  r = await reqAs('PATCH', `/projects/${novaId}/scope/${bReqId}`, { approvalStatus: 'AUTHORIZED' }, tokenB);
  check('C15 MEMBER scope approval change → 403', r.status === 403, `got ${r.status}`);
  r = await reqAs('POST', `/projects/${novaId}/scope`, { title: 'B sneaky', category: 'FEATURE', approvalStatus: 'AUTHORIZED' }, tokenB);
  check('C16 MEMBER create pre-AUTHORIZED requirement → 403', r.status === 403, `got ${r.status}`);
  r = await reqAs('POST', `/projects/${novaId}/change-requests/${crB.id}/approve`, {}, tokenB);
  check('C17 MEMBER approve → 403', r.status === 403, `got ${r.status}`);

  // ADMIN: approvals yes, project delete no
  r = await reqAs('PATCH', `/projects/${novaId}`, { description: 'Admin-edited description' }, tokenD);
  check('C18 ADMIN update project → 200', r.status === 200, `got ${r.status}`);
  r = await reqAs('DELETE', `/projects/${novaId}`, undefined, tokenD);
  check('C19 ADMIN delete project → 403 (owner-only)', r.status === 403, `got ${r.status}`);

  // Full authorization chain as ADMIN: approve B's open CR.
  r = await reqAs('POST', `/projects/${novaId}/change-requests/${crB.id}/approve`, {}, tokenD);
  check('C20 ADMIN approve CR → 200', r.status === 200 && r.json.data.status === 'APPROVED', `got ${r.status}`);
  r = await reqAs('POST', `/projects/${novaId}/commitments/${bCommitment.id}/verify`, {}, tokenD);
  check('C21 approval authorizes commitment (deterministic)', r.status === 200 && r.json.data.authorizationSource === 'CHANGE_REQUEST' && r.json.data.risk === 'LOW', JSON.stringify(r.json.data?.authorizationSource));

  // Self-role change is blocked for everyone.
  r = await reqAs('PATCH', `/projects/${novaId}/members/${USER_D}`, { role: 'VIEWER' }, tokenD);
  check('C22 ADMIN cannot change own role → 400', r.status === 400, `got ${r.status}`);
  r = await reqAs('PATCH', `/projects/${novaId}/members/${USER_A}`, { role: 'MEMBER' }, tokenD);
  check('C23 owner role is immutable → 403', r.status === 403, `got ${r.status}`);
  r = await reqAs('DELETE', `/projects/${novaId}/members/${USER_A}`, undefined, tokenD);
  check('C24 owner cannot be removed → 403', r.status === 403, `got ${r.status}`);

  r = await reqAs('PATCH', `/projects/${novaId}/members/${USER_C}`, { role: 'MEMBER' }, tokenD);
  check('C25 ADMIN promotes VIEWER → 200', r.status === 200 && r.json.data.role === 'MEMBER');
  r = await reqAs('DELETE', `/projects/${novaId}/members/${USER_C}`, undefined, tokenD);
  check('C26 ADMIN removes member → 200', r.status === 200);

  // ——— D. API security misc ———
  console.log('\n——— D. api security ———');

  r = await req('GET', '/projects/not-a-uuid');
  check('D1 invalid uuid → 400 (never 500)', r.status === 400 && r.json.success === false, `got ${r.status}`);
  r = await req('GET', `/projects/${novaId}/meetings/not-a-uuid`);
  check('D2 invalid nested uuid → 400', r.status === 400, `got ${r.status}`);
  r = await req('GET', '/projects?status=NOT_A_STATUS');
  check('D3 invalid enum filter → 400', r.status === 400, `got ${r.status}`);
  r = await req('POST', '/projects', { name: 'X', clientName: 'Y', hacker: true });
  check('D4 non-whitelisted body field → 400', r.status === 400, `got ${r.status}`);
  r = await reqAs('POST', '/projects', { name: 'X', clientName: 'Y' }, null, { 'Content-Type': 'application/json' });
  check('D5 unauthenticated create → 401', r.status === 401);

  const huge = 'x'.repeat(16 * 1024 * 1024);
  r = await req('POST', '/projects', { name: huge, clientName: 'Y' });
  check('D6 oversized JSON → 413 preserved', r.status === 413, `got ${r.status}`);

  r = await req('GET', '/projects/00000000-0000-4000-8000-000000000000');
  const body404 = JSON.stringify(r.json);
  check('D7 error bodies carry no stacks/paths', r.status === 404 && !/\\src\\|\(node:|at Object\./.test(body404));

  // ——— E. legacy owner fallback ———
  console.log('\n——— E. legacy owner fallback ———');

  const legacy = (await req('POST', '/projects', { name: 'Legacy Owner', clientName: 'L' })).json.data;
  const client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  await client.query('DELETE FROM project_members WHERE project_id = $1', [legacy.id]);
  const memberCount = (await client.query('SELECT count(*)::int AS c FROM project_members WHERE project_id = $1', [legacy.id])).rows[0].c;
  await client.end();
  check('E1 membership row removed via direct DB (simulates pre-P15 project)', memberCount === 0);

  r = await req('GET', `/projects/${legacy.id}`);
  check('E2 ownerUserId retains OWNER access without membership row', r.status === 200 && r.json.data.myRole === 'OWNER', `got ${r.status}`);
  r = await reqAs('GET', `/projects/${legacy.id}`, null, tokenB);
  check('E3 non-member still 404 on legacy project', r.status === 404);

  // Owner-only delete still works on a legacy-ownership project.
  r = await reqAs('DELETE', `/projects/${legacy.id}`, undefined, tokenB);
  check('E4 non-member cannot delete → 404', r.status === 404);

  // ——— summary ———
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
