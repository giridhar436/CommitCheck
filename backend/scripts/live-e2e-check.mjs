/**
 * One-off live E2E check (dev-only, not a regression suite).
 *
 * Proves the ES256 fix against the REAL Supabase project and the REAL
 * backend: creates a disposable mailbox (mail.tm), signs the user up on
 * Supabase, confirms the address from the inbox link, signs in for a real
 * ES256 access token, and drives protected backend endpoints with it.
 * Prints statuses only — never env values, tokens, or mailbox credentials.
 */
import { readFileSync } from 'node:fs';

const envText = readFileSync(new URL('../../.env', import.meta.url), 'utf8');
const envVar = (name) => {
  const line = envText.split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
  if (!line) throw new Error(`${name} missing from frontend .env`);
  return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, '');
};

const SB = envVar('VITE_SUPABASE_URL').replace(/\/+$/, '');
const ANON = envVar('VITE_SUPABASE_ANON_KEY');
const API = 'http://localhost:3000/api';

const LOCAL_PART = `cc-e2e-${Math.floor(Date.now() / 1000)}`;
const MAIL_PASS = 'Mailbox-Only-Pass-1!';
const SB_PASS = 'Cc-E2e-Test-2026!x';
let address;

// ——— mail.tm disposable mailbox ———
const mt = async (path, opts = {}, auth) =>
  fetch(`https://api.mail.tm${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

const domains = await mt('/domains?page=1');
if (domains.status !== 200 || !domains.body['hydra:member']?.length) {
  console.log('MAILBOX: no mail.tm domain available — live test blocked');
  process.exit(2);
}
address = `${LOCAL_PART}@${domains.body['hydra:member'][0].domain}`;
const acct = await mt('/accounts', { method: 'POST', body: JSON.stringify({ address, password: MAIL_PASS }) });
if (acct.status !== 201) {
  console.log(`MAILBOX: create failed (${acct.status})`);
  process.exit(2);
}
const mtToken = (await mt('/token', { method: 'POST', body: JSON.stringify({ address, password: MAIL_PASS }) })).body
  ?.token;
console.log(`MAILBOX: ready (${address})`);

// ——— Supabase signup (real project) ———
const signupRes = await fetch(`${SB}/auth/v1/signup`, {
  method: 'POST',
  headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: address, password: SB_PASS, data: { name: 'CC E2E' } }),
});
const signupBody = await signupRes.json().catch(() => null);
if (signupRes.status === 429) {
  console.log('SIGNUP: 429 rate-limited — rerun later');
  process.exit(2);
}
if (!signupRes.ok) {
  console.log(`SIGNUP: ${signupRes.status} ${signupBody?.msg ?? signupBody?.error_description ?? ''}`);
  process.exit(2);
}
console.log(`SIGNUP: ${signupRes.status} — confirmation email sent`);

// ——— read the confirmation link from the inbox ———
let verifyUrl = null;
for (let i = 0; i < 30 && !verifyUrl; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  const msgs = await mt('/messages?page=1', {}, mtToken);
  for (const m of msgs.body?.['hydra:member'] ?? []) {
    const full = await mt(`/messages/${m.id}`, {}, mtToken);
    const text = JSON.stringify(full.body);
    const match = text.match(/https:\/\/[^"\\]+\/auth\/v1\/verify\?[^"\\\s]+/);
    if (match) verifyUrl = match[0].replace(/\\&amp;/g, '&').replace(/&amp;/g, '&');
  }
}
if (!verifyUrl) {
  console.log('CONFIRM: no verification link arrived within 150s');
  process.exit(2);
}
const confirmRes = await fetch(verifyUrl, { redirect: 'manual' });
console.log(`CONFIRM: link fetched -> ${confirmRes.status}`);

// ——— real password sign-in: real ES256 session token ———
const loginRes = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: address, password: SB_PASS }),
});
const loginBody = await loginRes.json().catch(() => null);
const token = loginBody?.access_token;
if (!loginRes.ok || !token) {
  console.log(`LOGIN: ${loginRes.status} — ${loginBody?.error_description ?? 'no session'}`);
  process.exit(2);
}
const headerB64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
const alg = JSON.parse(Buffer.from(headerB64, 'base64').toString()).alg;
console.log(`LOGIN: ${loginRes.status} — real session issued; token alg=${alg}`);

// ——— drive the real backend with the real token ———
const authGet = async (path) => {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return { status: res.status, body: await res.json().catch(() => null) };
};

const me1 = await authGet('/auth/me');
console.log(
  `GET /auth/me -> ${me1.status}${
    me1.status === 200 ? ` (id=${me1.body?.data?.id}, email=${me1.body?.data?.email})` : ` ${JSON.stringify(me1.body)}`
  }`,
);
const projects = await authGet('/projects');
console.log(
  `GET /projects -> ${projects.status}${
    projects.status === 200 ? ` (${projects.body?.data?.items?.length ?? '?'} projects)` : ''
  }`,
);
const me2 = await authGet('/auth/me');
console.log(`GET /auth/me again (refresh simulation) -> ${me2.status}`);

process.exit(me1.status === 200 && projects.status === 200 && me2.status === 200 ? 0 : 1);
