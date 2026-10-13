/**
 * End-to-end Commitment Evidence API tests (dev-only): ephemeral PostgreSQL +
 * compiled Nest app; covers the immutable CRUD surface (POST/GET/GET by id/
 * DELETE, no PATCH), pagination, quote-only search, timestamp/createdAt
 * sorting, ownership chain (project → commitment → evidence), validation,
 * activity logs, and transaction integrity.
 * Usage: node scripts/test-evidence-api.mjs
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

/** Postgres ordering semantics: ASC → NULLS LAST, DESC → NULLS FIRST. */
function isOrderedDesc(values) {
  const nonNull = values.filter((v) => v !== null);
  if (values.some((v, i) => v !== null && values.slice(i + 1).some((w) => w === null))) return false; // a non-null before a null
  return nonNull.every((v, i) => i === 0 || nonNull[i - 1] >= v);
}
function isOrderedAsc(values) {
  const nonNull = values.filter((v) => v !== null);
  if (values.some((v, i) => v === null && values.slice(i + 1).some((w) => w !== null))) return false; // a null before a non-null
  return nonNull.every((v, i) => i === 0 || nonNull[i - 1] <= v);
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

  // Pick a NovaBank commitment to hang evidence on (Google Login has seed evidence).
  const novaCommitments = (await req('GET', `/projects/${NOVA_ID}/commitments`)).json.data.items;
  const google = novaCommitments.find((c) => c.title.includes('Google Login'));
  const csvExport = novaCommitments.find((c) => c.title.includes('CSV export'));
  const cartCommitments = (await req('GET', `/projects/${CART_ID}/commitments`)).json.data.items;
  const cartCommitment = cartCommitments[0];

  const evidence = (projectId, commitmentId) =>
    `/projects/${projectId}/commitments/${commitmentId}/evidence`;
  const URL_MAIN = evidence(NOVA_ID, google.id);

  let createdId;

  console.log('\n——— GET collection (seeded rows) ———');
  let r = await req('GET', URL_MAIN);
  const seededCount = r.json.data.totalItems;
  check('list → 200 envelope, seeded evidence present', r.status === 200 && r.json.success === true && seededCount > 0, JSON.stringify(r.json.data));
  const seededRow = r.json.data.items[0];
  check('list items expose id/commitmentId/quote/timestamp/source/createdAt only',
    'id' in seededRow && 'commitmentId' in seededRow && 'quote' in seededRow &&
    'timestamp' in seededRow && 'source' in seededRow && 'createdAt' in seededRow &&
    !('updatedAt' in seededRow) && !('latestActivity' in seededRow),
    JSON.stringify(seededRow));
  check('default sort timestamp ASC', isOrderedAsc(r.json.data.items.map((e) => e.timestamp)), JSON.stringify(r.json.data.items.map((e) => e.timestamp)));
  check('commitment detail evidenceCount reflects seeded rows', (await req('GET', evidence(NOVA_ID, google.id).replace(/\/evidence$/, ''))).json.data.evidenceCount === seededCount);

  console.log('\n——— POST ———');
  r = await req('POST', URL_MAIN, {
    quote: '  We will add Google login by the end of Q3.  ',
    timestamp: '2026-09-29T14:05:00.000Z',
    source: 'TRANSCRIPT',
  });
  createdId = r.json?.data?.id;
  check('create → 201 envelope with generated UUID', r.status === 201 && r.json.success === true && typeof createdId === 'string' && createdId.length === 36, JSON.stringify(r.json.data));
  check('quote is trimmed', r.json.data.quote === 'We will add Google login by the end of Q3.');
  check('timestamp stored as ISO', r.json.data.timestamp === '2026-09-29T14:05:00.000Z');
  check('source echoed', r.json.data.source === 'TRANSCRIPT');

  r = await req('POST', URL_MAIN, { quote: 'No timestamp row', source: 'NOTES' });
  const noTsId = r.json?.data?.id;
  check('timestamp omitted → null', r.status === 201 && r.json.data.timestamp === null);
  check('source accepts any EvidenceSource value', r.json.data.source === 'NOTES');

  console.log('\n——— POST validation ———');
  const before = (await req('GET', URL_MAIN)).json.data.totalItems;
  r = await req('POST', URL_MAIN, { timestamp: '2026-09-29T14:05:00Z', source: 'TRANSCRIPT' });
  check('missing quote → 400', r.status === 400 && r.json.success === false);
  r = await req('POST', URL_MAIN, { quote: '   ', source: 'TRANSCRIPT' });
  check('whitespace-only quote → 400', r.status === 400);
  r = await req('POST', URL_MAIN, { quote: 'x'.repeat(5001), source: 'TRANSCRIPT' });
  check('quote > 5000 chars → 400', r.status === 400);
  r = await req('POST', URL_MAIN, { quote: 'Exactly 5000 is fine: ' + 'x'.repeat(4978) });
  check('missing source → 400 (source required)', r.status === 400);
  r = await req('POST', URL_MAIN, { quote: 'valid quote', source: 'GOSSIP' });
  check('invalid source enum → 400', r.status === 400);
  r = await req('POST', URL_MAIN, { quote: 'valid quote', source: 42 });
  check('non-string source → 400', r.status === 400);
  r = await req('POST', URL_MAIN, { quote: 'valid quote', source: 'TRANSCRIPT', timestamp: 'not-a-date' });
  check('invalid timestamp → 400', r.status === 400);
  r = await req('POST', URL_MAIN, { quote: 'valid quote', source: 'TRANSCRIPT', speaker: 'ghost' });
  check('unknown property (whitelist+forbid) → 400', r.status === 400);
  r = await req('GET', URL_MAIN);
  check('rejected creates left count unchanged (transaction integrity)', r.json.data.totalItems === before, `${r.json.data.totalItems} vs ${before}`);

  console.log('\n——— GET by id ———');
  r = await req('GET', `${URL_MAIN}/${createdId}`);
  check('detail → 200 envelope, same row', r.status === 200 && r.json.data.id === createdId && r.json.data.commitmentId === google.id);
  r = await req('GET', `${URL_MAIN}/${RANDOM_ID}`);
  check('unknown evidence → 404', r.status === 404);
  r = await req('GET', `${URL_MAIN}/${google.id}`);
  check('commitment UUID as evidence id → 404', r.status === 404);

  console.log('\n——— immutability (no PATCH) ———');
  r = await req('PATCH', `${URL_MAIN}/${createdId}`, { quote: 'mutated' });
  check('PATCH evidence → 404 (no route)', r.status === 404);
  r = await req('GET', `${URL_MAIN}/${createdId}`);
  check('evidence unchanged after PATCH attempt', r.json.data.quote === 'We will add Google login by the end of Q3.');
  r = await req('PUT', `${URL_MAIN}/${createdId}`, { quote: 'mutated' });
  check('PUT evidence → 404 (no route)', r.status === 404);

  console.log('\n——— pagination ———');
  // one more row so the commitment has plenty
  await req('POST', URL_MAIN, { quote: 'Pagination filler row alpha', source: 'SUMMARY' });
  r = await req('GET', `${URL_MAIN}?page=1&limit=2`);
  check('limit=2 → 2 items, page 1', r.status === 200 && r.json.data.items.length === 2 && r.json.data.page === 1 && r.json.data.totalPages >= 2);
  const page1First = r.json.data.items[0].id;
  r = await req('GET', `${URL_MAIN}?page=2&limit=2`);
  check('page=2 → different rows, meta correct', r.status === 200 && r.json.data.items.length === 2 && r.json.data.items[0].id !== page1First);
  r = await req('GET', `${URL_MAIN}?limit=200`);
  check('limit=200 rejected (400)', r.status === 400);
  r = await req('GET', `${URL_MAIN}?page=0`);
  check('page=0 rejected (400)', r.status === 400);

  console.log('\n——— search (quote only) ———');
  r = await req('GET', `${URL_MAIN}?search=filler`);
  check('search quote substring → 1', r.status === 200 && r.json.data.totalItems === 1 && r.json.data.items[0].quote.includes('filler'));
  r = await req('GET', `${URL_MAIN}?search=FILLER`);
  check('search is case-insensitive', r.status === 200 && r.json.data.totalItems === 1);
  r = await req('GET', `${URL_MAIN}?search=NOTES`);
  check('search does NOT match source field', r.status === 200 && r.json.data.totalItems === 0);
  r = await req('GET', `${URL_MAIN}?search=zzz-no-such-quote`);
  check('search no match → empty page', r.status === 200 && r.json.data.totalItems === 0 && r.json.data.items.length === 0);

  console.log('\n——— sorting ———');
  r = await req('GET', `${URL_MAIN}?sortBy=timestamp&sortOrder=desc`);
  check('sort timestamp desc → descending', isOrderedDesc(r.json.data.items.map((e) => e.timestamp)), JSON.stringify(r.json.data.items.map((e) => e.timestamp)));
  r = await req('GET', `${URL_MAIN}?sortBy=createdAt`);
  const cr = r.json.data.items.map((e) => e.createdAt);
  check('sort createdAt asc allowed', r.status === 200 && JSON.stringify(cr) === JSON.stringify([...cr].sort()));
  r = await req('GET', `${URL_MAIN}?sortBy=quote`);
  check('sortBy=quote rejected (400)', r.status === 400);
  r = await req('GET', `${URL_MAIN}?sortBy=source`);
  check('sortBy=source rejected (400)', r.status === 400);
  r = await req('GET', `${URL_MAIN}?sortOrder=up`);
  check('invalid sortOrder → 400', r.status === 400);

  console.log('\n——— ownership chain ———');
  r = await req('GET', evidence(RANDOM_ID, google.id));
  check('unknown project → 404', r.status === 404);
  r = await req('GET', evidence(NOVA_ID, RANDOM_ID));
  check('unknown commitment → 404', r.status === 404);
  r = await req('GET', evidence(CART_ID, google.id));
  check('commitment from another project → 404', r.status === 404);
  r = await req('GET', evidence(NOVA_ID, cartCommitment.id));
  check('cart commitment under nova project → 404', r.status === 404);
  r = await req('GET', evidence(NOVA_ID, csvExport.id) + `/${createdId}`);
  check("another commitment's evidence by id → 404", r.status === 404);
  r = await req('GET', evidence(NOVA_ID, google.id) + `/${RANDOM_ID}`);
  check('unknown evidence on valid commitment → 404', r.status === 404);
  r = await req('GET', `/projects/${NOVA_ID}/commitments/not-a-uuid/evidence`);
  check('non-UUID commitmentId → 400', r.status === 400);
  r = await req('POST', evidence(CART_ID, google.id), { quote: 'smuggled', source: 'OTHER' });
  check('POST via wrong project → 404', r.status === 404);
  r = await req('DELETE', evidence(CART_ID, google.id) + `/${createdId}`);
  check('DELETE via wrong project → 404', r.status === 404);

  console.log('\n——— activity logging ———');
  r = await req('GET', `/projects/${NOVA_ID}`);
  check('project audit trail logs EVIDENCE_ADDED', r.json.data.latestActivity?.action === 'EVIDENCE_ADDED', JSON.stringify(r.json.data.latestActivity));
  check('activity entityType=COMMITMENT, entityId=commitment UUID', r.json.data.latestActivity?.entityType === 'COMMITMENT' && r.json.data.latestActivity?.entityId === google.id);
  r = await req('GET', `/projects/${NOVA_ID}/commitments/${google.id}`);
  check('commitment detail latestActivity is EVIDENCE_ADDED', r.json.data.latestActivity?.action === 'EVIDENCE_ADDED');

  console.log('\n——— DELETE ———');
  r = await req('DELETE', `${URL_MAIN}/${createdId}`);
  check('DELETE → 200 envelope, returns id', r.status === 200 && r.json.success === true && r.json.data.id === createdId);
  r = await req('GET', `${URL_MAIN}/${createdId}`);
  check('deleted evidence → 404', r.status === 404);
  r = await req('GET', `/projects/${NOVA_ID}`);
  check('audit trail logs EVIDENCE_DELETED', r.json.data.latestActivity?.action === 'EVIDENCE_DELETED', JSON.stringify(r.json.data.latestActivity));
  r = await req('DELETE', `${URL_MAIN}/${createdId}`);
  check('DELETE again → 404', r.status === 404);
  r = await req('GET', `/projects/${NOVA_ID}/commitments/${google.id}`);
  check('evidenceCount decremented after delete', r.json.data.evidenceCount === before, `${r.json.data.evidenceCount} vs ${before}`);

  // cleanup extras so later runs stay deterministic
  await req('DELETE', `${URL_MAIN}/${noTsId}`);
  const filler = (await req('GET', `${URL_MAIN}?search=filler`)).json.data.items[0];
  if (filler) await req('DELETE', `${URL_MAIN}/${filler.id}`);

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
