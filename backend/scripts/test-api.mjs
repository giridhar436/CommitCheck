/**
 * End-to-end API tests (dev-only): ephemeral PostgreSQL + compiled Nest app,
 * then exercises every Projects endpoint — success and failure paths.
 * Usage: node scripts/test-api.mjs
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

// ——— tiny assertion harness ———
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
  console.log('\n——— GET /projects ———');

  // 1. list
  let r = await req('GET', '/projects');
  check('GET /projects → 200 envelope', r.status === 200 && r.json.success === true && r.json.message === 'Projects fetched successfully');
  const list = r.json.data;
  check('list shape (items/page/limit/totalItems/totalPages)', !!list && Array.isArray(list.items) && list.page === 1 && list.limit === 10 && list.totalItems === 2 && list.totalPages === 1, JSON.stringify(list));

  // 2. pagination
  r = await req('GET', '/projects?page=2&limit=1');
  check('pagination page=2&limit=1', r.status === 200 && r.json.data.items.length === 1 && r.json.data.totalPages === 2 && r.json.data.page === 2);

  // 3. validation of query
  r = await req('GET', '/projects?limit=200');
  check('limit=200 rejected (400)', r.status === 400 && r.json.success === false, JSON.stringify(r.json));
  r = await req('GET', '/projects?page=0');
  check('page=0 rejected (400)', r.status === 400);
  r = await req('GET', '/projects?sortBy=id');
  check('sortBy=id rejected (400)', r.status === 400);

  // 4. status filter
  r = await req('GET', '/projects?status=ACTIVE');
  check('status=ACTIVE → 1 item', r.status === 200 && r.json.data.totalItems === 1 && r.json.data.items[0].status === 'ACTIVE');
  r = await req('GET', '/projects?status=ON_HOLD');
  check('status=ON_HOLD → 1 item', r.status === 200 && r.json.data.totalItems === 1);
  r = await req('GET', '/projects?status=BOGUS');
  check('status=BOGUS rejected (400)', r.status === 400);

  // 5. search
  r = await req('GET', '/projects?search=nova');
  check('search=nova → NovaBank', r.status === 200 && r.json.data.totalItems === 1 && r.json.data.items[0].clientName === 'NovaBank Ltd.');
  r = await req('GET', '/projects?search=grocery');
  check('search=grocery → FreshCART (client match)', r.status === 200 && r.json.data.totalItems === 1 && r.json.data.items[0].name === 'FreshCART Storefront');
  r = await req('GET', '/projects?search=zzz');
  check('search=zzz → empty page', r.status === 200 && r.json.data.totalItems === 0 && r.json.data.items.length === 0);

  // 6. sorting
  r = await req('GET', '/projects?sortBy=name&sortOrder=asc');
  check('sort by name asc → FreshCART first', r.status === 200 && r.json.data.items[0].name === 'FreshCART Storefront');

  console.log('\n——— GET /projects/:id ———');
  const novaId = (await req('GET', '/projects?search=novabank')).json.data.items[0].id;
  r = await req('GET', `/projects/${novaId}`);
  const detail = r.json.data;
  check('detail → 200 with counts', r.status === 200 && detail.counts.scopeRequirements === 4 && detail.counts.meetings === 3 && detail.counts.commitments === 4 && detail.counts.changeRequests === 2 && detail.counts.documents === 3, JSON.stringify(detail?.counts));
  check('detail latestActivity present', detail.latestActivity && detail.latestActivity.action === 'CHANGE_REQUEST_CREATED', JSON.stringify(detail.latestActivity));

  r = await req('GET', '/projects/not-a-uuid');
  check('invalid uuid → 400', r.status === 400 && r.json.success === false);
  r = await req('GET', `/projects/00000000-0000-4000-8000-000000000000`);
  check('unknown uuid → 404', r.status === 404 && r.json.success === false);

  console.log('\n——— POST /projects ———');
  const valid = { name: 'Apollo CRM', clientName: 'Apollo Systems', description: 'Test project', budget: 15000.5, startDate: '2026-10-01', endDate: '2026-12-01' };
  r = await req('POST', '/projects', valid);
  check('POST valid → created (ACTIVE default)', r.status === 201 && r.json.success === true && r.json.data.status === 'ACTIVE' && r.json.data.budget === 15000.5, JSON.stringify(r.json));
  const createdId = r.json?.data?.id;

  r = await req('GET', `/projects/${createdId}`);
  check('created project detail: zero counts + PROJECT_CREATED activity', r.json.data.counts.meetings === 0 && r.json.data.latestActivity?.action === 'PROJECT_CREATED', JSON.stringify(r.json.data));

  r = await req('POST', '/projects', { ...valid, name: 'novabank mobile app', clientName: 'NovaBank Ltd.' });
  check('duplicate name+client → 409', r.status === 409 && r.json.success === false, JSON.stringify(r.json));

  r = await req('POST', '/projects', { name: 'No Client' });
  check('missing clientName → 400', r.status === 400);
  r = await req('POST', '/projects', { name: '   ', clientName: 'X' });
  check('empty name → 400', r.status === 400);
  r = await req('POST', '/projects', { name: 'X', clientName: 'Y', budget: -5 });
  check('negative budget → 400', r.status === 400);
  r = await req('POST', '/projects', { name: 'X', clientName: 'Y', startDate: '2026-12-01', endDate: '2026-10-01' });
  check('startDate > endDate → 400', r.status === 400 && r.json.message === 'Start date cannot be after end date', JSON.stringify(r.json));
  r = await req('POST', '/projects', { name: 'X', clientName: 'Y', hacker: true });
  check('unknown property → 400', r.status === 400, JSON.stringify(r.json));
  r = await req('POST', '/projects', { name: 'X', clientName: 'Y', startDate: 'not-a-date' });
  check('invalid date → 400', r.status === 400);
  r = await req('POST', '/projects', { name: 'X', clientName: 'Y', status: 'BROKEN' });
  check('invalid status → 400', r.status === 400);

  console.log('\n——— PATCH /projects/:id ———');
  r = await req('PATCH', `/projects/${createdId}`, { description: 'Updated description', budget: 20000 });
  check('PATCH valid → 200 + updated fields', r.status === 200 && r.json.data.description === 'Updated description' && r.json.data.budget === 20000);
  check('PATCH bumps updatedAt + logs PROJECT_UPDATED', r.json.data.updatedAt >= r.json.data.createdAt && (await req('GET', `/projects/${createdId}`)).json.data.latestActivity?.action === 'PROJECT_UPDATED');

  r = await req('PATCH', `/projects/${createdId}`, { endDate: '2026-09-01' });
  check('PATCH endDate before startDate (merged) → 400', r.status === 400 && r.json.message === 'Start date cannot be after end date');
  r = await req('PATCH', `/projects/${createdId}`, { status: 'ON_HOLD' });
  check('PATCH status → ON_HOLD', r.status === 200 && r.json.data.status === 'ON_HOLD');
  r = await req('PATCH', '/projects/00000000-0000-4000-8000-000000000000', { name: 'Ghost' });
  check('PATCH unknown id → 404', r.status === 404);
  r = await req('PATCH', `/projects/${createdId}`, { bogus: 1 });
  check('PATCH unknown property → 400', r.status === 400);

  console.log('\n——— DELETE /projects/:id ———');
  r = await req('DELETE', `/projects/${createdId}`);
  check('DELETE → 200 envelope', r.status === 200 && r.json.success === true && r.json.data.id === createdId);
  r = await req('GET', `/projects/${createdId}`);
  check('deleted project → 404', r.status === 404);
  r = await req('GET', '/projects');
  check('list back to 2 items after delete', r.json.data.totalItems === 2);
  r = await req('DELETE', '/projects/00000000-0000-4000-8000-000000000000');
  check('DELETE unknown id → 404', r.status === 404);

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
