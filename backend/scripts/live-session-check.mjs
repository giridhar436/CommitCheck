/**
 * One-off session-lifecycle check (dev-only): logs an EXISTING confirmed
 * Supabase user in, then exercises refresh and logout against the real
 * project + real backend. Args: <email> <password>. Prints statuses only.
 */
import { decodeProtectedHeader } from 'jose';
import { readFileSync } from 'node:fs';

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error('usage: node scripts/live-session-check.mjs <email> <password>');
  process.exit(1);
}
const envText = readFileSync(new URL('../../.env', import.meta.url), 'utf8');
const envVar = (name) => {
  const line = envText.split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
  return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, '');
};
const SB = envVar('VITE_SUPABASE_URL').replace(/\/+$/, '');
const ANON = envVar('VITE_SUPABASE_ANON_KEY');
const API = 'http://localhost:3000/api';

// 1 — real password login
const loginRes = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const session = await loginRes.json().catch(() => null);
if (!loginRes.ok || !session?.access_token) {
  console.log(`LOGIN: ${loginRes.status} — ${session?.error_description ?? 'no session'}`);
  process.exit(2);
}
const header = decodeProtectedHeader(session.access_token);
console.log(`LOGIN: 200 — alg=${header.alg} kid=${String(header.kid ?? 'none').slice(0, 8)}…`);

const me = async (token) => {
  const r = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  return r.status;
};

// 2 — backend accepts the fresh token
const me1 = await me(session.access_token);
console.log(`GET /auth/me (fresh token) -> ${me1}`);

// 3 — page-refresh path: Supabase refresh, then backend accepts the new token
const refreshRes = await fetch(`${SB}/auth/v1/token?grant_type=refresh_token`, {
  method: 'POST',
  headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ refresh_token: session.refresh_token }),
});
const refreshed = await refreshRes.json().catch(() => null);
const me2 = refreshed?.access_token ? await me(refreshed.access_token) : `login ${refreshRes.status}`;
console.log(`REFRESH -> ${refreshRes.status}, GET /auth/me (new token) -> ${me2}`);

// 4 — logout revokes the session server-side
const logoutRes = await fetch(`${SB}/auth/v1/logout`, {
  method: 'POST',
  headers: { apikey: ANON, Authorization: `Bearer ${refreshed?.access_token ?? session.access_token}` },
});
console.log(`LOGOUT -> ${logoutRes.status}`);

// 5 — the revoked refresh token must no longer mint sessions
const revokedRes = await fetch(`${SB}/auth/v1/token?grant_type=refresh_token`, {
  method: 'POST',
  headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ refresh_token: session.refresh_token }),
});
console.log(`REFRESH after logout -> ${revokedRes.status} (expected 400)`);

process.exit(me1 === 200 && me2 === 200 && logoutRes.ok && revokedRes.status === 400 ? 0 : 1);
