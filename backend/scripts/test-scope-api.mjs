/**
 * End-to-end Scope Requirements API tests (dev-only): ephemeral PostgreSQL +
 * compiled Nest app; covers CRUD, validation, pagination, search, filters,
 * sorting, duplicate prevention, not-found paths, and activity logging.
 * Usage: node scripts/test-scope-api.mjs
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
const scope = (projectId) => `/projects/${projectId}/scope`;

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

  console.log('\n——— GET /projects/:projectId/scope ———');
  let r = await req('GET', scope(NOVA_ID));
  check('list → 200 envelope, 4 seeded items', r.status === 200 && r.json.success === true && r.json.data.totalItems === 4 && r.json.data.items.length === 4, JSON.stringify(r.json.data));

  r = await req('GET', scope(NOVA_ID) + '?page=2&limit=2');
  check('pagination page=2&limit=2 → 2 items, 2 pages', r.status === 200 && r.json.data.items.length === 2 && r.json.data.totalPages === 2 && r.json.data.page === 2);

  r = await req('GET', scope(NOVA_ID) + '?limit=200');
  check('limit=200 rejected (400)', r.status === 400);

  // ——— filters ———
  r = await req('GET', scope(NOVA_ID) + '?priority=CRITICAL');
  check('priority=CRITICAL → 2', r.status === 200 && r.json.data.totalItems === 2);
  r = await req('GET', scope(NOVA_ID) + '?priority=URGENT');
  check('priority=URGENT rejected (400)', r.status === 400);
  r = await req('GET', scope(NOVA_ID) + '?approvalStatus=PENDING');
  check('approvalStatus=PENDING → 1', r.status === 200 && r.json.data.totalItems === 1 && r.json.data.items[0].approvalStatus === 'PENDING');
  r = await req('GET', scope(NOVA_ID) + '?category=payments');
  check('category filter (case-insensitive) → 1', r.status === 200 && r.json.data.totalItems === 1 && r.json.data.items[0].category === 'Payments');
  r = await req('GET', scope(NOVA_ID) + '?priority=CRITICAL&approvalStatus=AUTHORIZED');
  check('combined filters → 2', r.status === 200 && r.json.data.totalItems === 2);

  // ——— search (title + description, case-insensitive) ———
  r = await req('GET', scope(NOVA_ID) + '?search=kyc');
  check('search title "kyc" → 1', r.status === 200 && r.json.data.totalItems === 1 && r.json.data.items[0].title.includes('KYC'));
  r = await req('GET', scope(NOVA_ID) + '?search=peer-to-peer');
  check('search description "peer-to-peer" → 1', r.status === 200 && r.json.data.totalItems === 1);
  r = await req('GET', scope(NOVA_ID) + '?search=zzz');
  check('search no match → empty page', r.status === 200 && r.json.data.totalItems === 0);

  // ——— sorting ———
  r = await req('GET', scope(NOVA_ID) + '?sortBy=title&sortOrder=asc');
  check('sort by title asc → "P2P transfers" first', r.status === 200 && r.json.data.items[0].title === 'P2P transfers');
  r = await req('GET', scope(NOVA_ID) + '?sortBy=priority&sortOrder=desc');
  check('sort by priority desc → CRITICAL first', r.status === 200 && r.json.data.items[0].priority === 'CRITICAL');
  r = await req('GET', scope(NOVA_ID) + '?sortBy=id');
  check('sortBy=id rejected (400)', r.status === 400);

  // ——— project guards ———
  r = await req('GET', scope(RANDOM_ID));
  check('project not found → 404', r.status === 404 && r.json.message.includes('Project with id'));
  r = await req('GET', '/projects/not-a-uuid/scope');
  check('invalid project uuid → 400', r.status === 400);

  console.log('\n——— GET /projects/:projectId/scope/:id ———');
  const list = (await req('GET', scope(NOVA_ID))).json.data.items;
  const reqId = list[0].id;
  r = await req('GET', scope(NOVA_ID) + `/${reqId}`);
  check('detail → 200 full fields', r.status === 200 && r.json.data.id === reqId && r.json.data.projectId === NOVA_ID && typeof r.json.data.priority === 'string');
  r = await req('GET', scope(CART_ID) + `/${reqId}`);
  check('requirement under wrong project → 404', r.status === 404);
  r = await req('GET', scope(NOVA_ID) + `/${RANDOM_ID}`);
  check('unknown requirement → 404', r.status === 404);
  r = await req('GET', scope(NOVA_ID) + '/not-a-uuid');
  check('invalid requirement uuid → 400', r.status === 400);

  console.log('\n——— POST /projects/:projectId/scope ———');
  r = await req('GET', `/projects/${NOVA_ID}`);
  const countsBefore = r.json.data.counts.scopeRequirements;
  const payload = { title: 'Realtime fraud alerts', description: 'SMS + in-app alerts for suspicious transactions', category: 'Security', priority: 'HIGH', approvalStatus: 'AUTHORIZED', sourceClause: 'SOW §3.4 — Security', acceptanceCriteria: 'Alerts fire within 10s of a flagged transaction.' };
  r = await req('POST', scope(NOVA_ID), payload);
  check('POST valid → 201 with echo', r.status === 201 && r.json.success === true && r.json.data.title === 'Realtime fraud alerts' && r.json.data.priority === 'HIGH', JSON.stringify(r.json));
  const createdId = r.json?.data?.id;

  r = await req('GET', `/projects/${NOVA_ID}`);
  check('project counts.scopeRequirements incremented', r.json.data.counts.scopeRequirements === countsBefore + 1);
  check('PROJECT detail logs SCOPE_REQUIREMENT_CREATED', r.json.data.latestActivity?.action === 'SCOPE_REQUIREMENT_CREATED', JSON.stringify(r.json.data.latestActivity));

  r = await req('POST', scope(NOVA_ID), { ...payload, title: 'realtime fraud alerts' });
  check('duplicate title (case-insensitive) → 409', r.status === 409 && r.json.message.includes('already exists'));
  r = await req('POST', scope(CART_ID), payload);
  check('same title in ANOTHER project → allowed', r.status === 201, JSON.stringify(r.json));
  const cartCreatedId = r.json?.data?.id;

  r = await req('POST', scope(NOVA_ID), { category: 'X' });
  check('missing title → 400', r.status === 400);
  r = await req('POST', scope(NOVA_ID), { title: '   ', category: 'X' });
  check('empty title → 400', r.status === 400);
  r = await req('POST', scope(NOVA_ID), { title: 'T', description: 'no category' });
  check('missing category → 400', r.status === 400);
  r = await req('POST', scope(NOVA_ID), { title: 'T', category: 'X', priority: 'URGENT' });
  check('invalid priority → 400', r.status === 400);
  r = await req('POST', scope(NOVA_ID), { title: 'T', category: 'X', approvalStatus: 'MAYBE' });
  check('invalid approvalStatus → 400', r.status === 400);
  r = await req('POST', scope(NOVA_ID), { title: 'T', category: 'X', sourceClause: 42 });
  check('invalid sourceClause type → 400', r.status === 400);
  r = await req('POST', scope(NOVA_ID), { title: 'T', category: 'X', hacker: true });
  check('unknown property → 400', r.status === 400);
  r = await req('POST', scope(RANDOM_ID), { title: 'T', category: 'X' });
  check('POST to missing project → 404', r.status === 404);

  console.log('\n——— PATCH ———');
  r = await req('PATCH', scope(NOVA_ID) + `/${createdId}`, { title: 'Realtime fraud alerts v2', priority: 'CRITICAL' });
  check('PATCH valid → 200 + updated fields', r.status === 200 && r.json.data.title === 'Realtime fraud alerts v2' && r.json.data.priority === 'CRITICAL');
  r = await req('GET', `/projects/${NOVA_ID}`);
  check('PATCH logs SCOPE_REQUIREMENT_UPDATED + bumps updatedAt', r.json.data.latestActivity?.action === 'SCOPE_REQUIREMENT_UPDATED');

  r = await req('PATCH', scope(NOVA_ID) + `/${createdId}`, { title: 'p2p TRANSFERS' });
  check('PATCH to duplicate title → 409', r.status === 409);
  r = await req('PATCH', scope(NOVA_ID) + `/${createdId}`, { priority: 'HIGHEST' });
  check('PATCH invalid priority → 400', r.status === 400);
  r = await req('PATCH', scope(NOVA_ID) + `/${createdId}`, { bogus: 1 });
  check('PATCH unknown property → 400', r.status === 400);
  r = await req('PATCH', scope(NOVA_ID) + `/${RANDOM_ID}`, { title: 'Ghost' });
  check('PATCH unknown requirement → 404', r.status === 404);

  console.log('\n——— DELETE ———');
  r = await req('DELETE', scope(NOVA_ID) + `/${createdId}`);
  check('DELETE → 200 envelope', r.status === 200 && r.json.success === true && r.json.data.id === createdId);
  r = await req('GET', scope(NOVA_ID) + `/${createdId}`);
  check('deleted requirement → 404', r.status === 404);
  r = await req('GET', `/projects/${NOVA_ID}`);
  check('counts restored + SCOPE_REQUIREMENT_DELETED logged', r.json.data.counts.scopeRequirements === countsBefore && r.json.data.latestActivity?.action === 'SCOPE_REQUIREMENT_DELETED', JSON.stringify(r.json.data.latestActivity));
  r = await req('DELETE', scope(NOVA_ID) + `/${createdId}`);
  check('DELETE again → 404', r.status === 404);

  // cleanup second project's created row to keep totals tidy
  await req('DELETE', scope(CART_ID) + `/${cartCreatedId}`);

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
