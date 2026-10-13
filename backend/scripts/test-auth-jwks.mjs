/**
 * Phase 15 fix — asymmetric (JWKS) token verification suite.
 *
 * Current Supabase projects sign user access tokens with asymmetric keys
 * published at /auth/v1/.well-known/jwks.json (e.g. ES256); the legacy
 * HS256 shared-secret path can never verify those tokens. This suite
 * reproduces that world exactly:
 *
 * - generates a real ES256 keypair,
 * - serves the public key from a stub JWKS endpoint,
 * - boots the API with SUPABASE_URL pointing at the stub (and NO
 *   SUPABASE_JWT_SECRET, matching such deployments),
 * - and asserts ES256 tokens authenticate end-to-end while forged/mismatched
 *   tokens fail with the uniform 401.
 *
 * It then (section J2) boots a second API instance with BOTH the JWKS and
 * the legacy secret configured, proving coexistence: HS256 tokens verify via
 * the secret, ES256 tokens via the JWKS, and a forged HS256 token signed
 * with an attacker's secret is rejected.
 */
import { spawn, execSync } from 'node:child_process';
import { createServer } from 'node:http';
import EmbeddedPostgres from 'embedded-postgres';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import { USER_A, TEST_JWT_SECRET, signToken } from './lib/auth-helper.mjs';

const PG_PORT = 5438;
const API_PORT = 3108;
const STUB_PORT = 3203;
const BASE = `http://localhost:${API_PORT}/api`;
const DB = 'verify_pg';

// ——— tiny assertion harness ———
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? '✅' : '❌'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
}

async function reqAs(path, token, extra = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra,
    },
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

function spawnApi(extraEnv) {
  const child = spawn('node', ['dist/main.js'], {
    env: {
      ...process.env,
      DATABASE_URL: `postgresql://postgres:postgres@localhost:${PG_PORT}/${DB}`,
      DIRECT_URL: `postgresql://postgres:postgres@localhost:${PG_PORT}/${DB}`,
      PORT: String(API_PORT),
      EMBEDDING_PROVIDER: '',
      ...extraEnv,
    },
    stdio: 'pipe',
  });
  child.stderr.on('data', (d) => process.stderr.write(d));
  return child;
}

function stopApi(child) {
  return new Promise((resolve) => {
    child.on('exit', resolve);
    child.kill();
    setTimeout(() => {
      try {
        execSync(`taskkill //F //PID ${child.pid} //T`, { stdio: 'ignore' });
      } catch {
        /* exited already */
      }
      resolve();
    }, 3000);
  });
}

// ——— ES256 key material (the real project signs with ES256) ———
const { publicKey, privateKey } = await generateKeyPair('ES256');
const publicJwk = { ...(await exportJWK(publicKey)), alg: 'ES256', use: 'sig', kid: 'test-es256-key-1' };

// ——— stub Supabase Auth: publishes the JWKS exactly like Supabase does ———
const stub = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${STUB_PORT}`);
  if (url.pathname === '/auth/v1/.well-known/jwks.json') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ keys: [publicJwk] }));
    return;
  }
  res.writeHead(404).end('{}');
});

const pgx = new EmbeddedPostgres({
  databaseDir: './.verify-pg-data',
  user: 'postgres',
  password: 'postgres',
  port: PG_PORT,
  persistent: false,
});

/** Mint an ES256 token signed by the stub's private key (Supabase's role). */
const signEs256 = async (userId, email = 'rahul@pixelforge.io', { expiresIn = '1h' } = {}) =>
  new SignJWT({ email, role: 'authenticated' })
    .setProtectedHeader({ alg: 'ES256', kid: 'test-es256-key-1' })
    .setSubject(userId)
    .setIssuedAt()
    .setAudience('authenticated')
    .setExpirationTime(expiresIn)
    .sign(privateKey);

const pgClient = null; // not needed — this suite reads nothing directly from pg
let api;

try {
  console.log('Starting ephemeral PostgreSQL + JWKS stub + API (JWKS-only config)…');
  await new Promise((r) => stub.listen(STUB_PORT, r));
  await pgx.initialise();
  await pgx.start();
  await pgx.createDatabase(DB);
  const envCommon = {
    DATABASE_URL: `postgresql://postgres:postgres@localhost:${PG_PORT}/${DB}`,
    DIRECT_URL: `postgresql://postgres:postgres@localhost:${PG_PORT}/${DB}`,
  };
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, ...envCommon },
    stdio: 'inherit',
  });
  execSync('npm run db:seed', { env: { ...process.env, ...envCommon }, stdio: 'inherit' });

  // ——— J1. JWKS-only deployment (no SUPABASE_JWT_SECRET) ———
  api = spawnApi({ SUPABASE_URL: `http://localhost:${STUB_PORT}`, SUPABASE_JWT_SECRET: '' });
  await waitReady();

  const esToken = await signEs256(USER_A);
  let r = await reqAs('/auth/me', esToken);
  check('J1: ES256 token → /auth/me 200 with identity', r.status === 200 && r.json?.data?.id === USER_A, JSON.stringify(r.json));
  r = await reqAs('/projects', esToken);
  check('J1: ES256 token → /projects 200', r.status === 200 && r.json?.success === true);

  r = await reqAs('/auth/me', null);
  check('J1: no token → 401 Authentication required', r.status === 401 && r.json?.message === 'Authentication required');

  r = await reqAs('/auth/me', await signToken(USER_A));
  check('J1: HS256 token (no secret configured) → uniform 401', r.status === 401 && r.json?.message === 'Invalid or expired token');

  // Tampered ES256 token (flipped payload signature byte).
  const parts = esToken.split('.');
  const forgedSig = `${parts[0]}.${parts[1]}.${parts[2].slice(0, -2)}${parts[2].slice(-2) === 'aa' ? 'bb' : 'aa'}`;
  r = await reqAs('/auth/me', forgedSig);
  check('J1: tampered ES256 token → uniform 401', r.status === 401 && r.json?.message === 'Invalid or expired token');

  // HS256 token signed with an attacker-chosen secret — no verifier accepts it:
  // the JWKS holds only ES256 keys, and SUPABASE_JWT_SECRET is not configured.
  const noneToken = await new SignJWT({ email: 'x' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(USER_A).setIssuedAt().setExpirationTime('1h')
    .sign(new TextEncoder().encode('attacker-secret-not-the-real-one'));
  r = await reqAs('/auth/me', noneToken);
  check('J1: HS256 token signed by attacker secret → 401', r.status === 401 && r.json?.message === 'Invalid or expired token');

  // Expired ES256 token.
  const expired = await new SignJWT({ email: 'rahul@pixelforge.io' })
    .setProtectedHeader({ alg: 'ES256', kid: 'test-es256-key-1' })
    .setSubject(USER_A).setIssuedAt()
    .setExpirationTime('1s')
    .sign(privateKey);
  await new Promise((r) => setTimeout(r, 1500));
  r = await reqAs('/auth/me', expired);
  check('J1: expired ES256 token → uniform 401', r.status === 401 && r.json?.message === 'Invalid or expired token');

  await stopApi(api);
  api = null;

  // ——— J2. Coexistence: JWKS + legacy secret both configured ———
  console.log('\nRestarting API with JWKS + HS256 secret configured…');
  api = spawnApi({
    SUPABASE_URL: `http://localhost:${STUB_PORT}`,
    SUPABASE_JWT_SECRET: TEST_JWT_SECRET,
  });
  await waitReady();

  r = await reqAs('/auth/me', await signEs256(USER_A));
  check('J2: ES256 token still verifies (JWKS path)', r.status === 200 && r.json?.data?.id === USER_A);
  r = await reqAs('/auth/me', await signToken(USER_A));
  check('J2: HS256 token verifies (legacy secret path)', r.status === 200 && r.json?.data?.id === USER_A);
  r = await reqAs('/auth/me', noneToken);
  check('J2: attacker-signed HS256 token → 401', r.status === 401 && r.json?.message === 'Invalid or expired token');
  r = await reqAs('/projects', await signEs256(USER_A));
  check('J2: protected project API works with ES256 token', r.status === 200);
} catch (err) {
  console.error('\nSUITE ERROR:', err);
  process.exitCode = 1;
} finally {
  if (api) await stopApi(api);
  try {
    await pgx.stop();
  } catch {
    /* already stopped */
  }
  try {
    stub.close();
  } catch {
    /* already closed */
  }
  console.log('Ephemeral PostgreSQL stopped.');
}

console.log(`\n${results.filter((x) => x.ok).length}/${results.length} checks passed`);
if (results.some((x) => !x.ok)) process.exitCode = 1;

// Force-exit: an embedded-postgres child handle can outlive the suite on
// Windows and block a clean exit after the summary has printed.
process.exit(process.exitCode || 0);
