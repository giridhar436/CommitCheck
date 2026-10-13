/**
 * Authentication configuration (Phase 15).
 *
 * Supabase Auth is the sole identity source: it issues signed access tokens
 * and the backend verifies them to establish identity — it never
 * authenticates users itself. Two token eras exist in the wild:
 *
 * - **Legacy projects** sign access tokens with the shared HS256 project JWT
 *   secret (`SUPABASE_JWT_SECRET`).
 * - **Current projects** publish asymmetric signing keys (ES256/RS256/…)
 *   through a public JWKS endpoint and sign user tokens with the current
 *   key. A shared-secret HS256 check can never validate those tokens —
 *   they must be verified against the project's published public keys
 *   (`SUPABASE_URL` + `/auth/v1/.well-known/jwks.json`).
 *
 * The guard routes a token by its `alg` header claim (see
 * supabase-auth.guard.ts); this module only resolves verifiers. Secret
 * values are never logged.
 */

import { createRemoteJWKSet } from 'jose';

/** Thrown when authentication cannot be configured at all. Mapped to a clear startup failure. */
export class AuthConfigError extends Error {
  readonly configKey: string;

  constructor(configKey: string, reason: string) {
    super(`Configuration error: ${configKey} — ${reason}`);
    this.name = 'AuthConfigError';
    this.configKey = configKey;
  }
}

let cachedSecret: Uint8Array | null | undefined;

/**
 * Returns the Supabase JWT secret as bytes for jose's HS256 verification,
 * or null when unset (asymmetric-key projects verify via JWKS instead).
 * Never logs the secret.
 */
export function getSupabaseJwtSecret(): Uint8Array | null {
  if (cachedSecret !== undefined) return cachedSecret;

  const raw = process.env.SUPABASE_JWT_SECRET;
  cachedSecret = raw && raw.trim() !== '' ? new TextEncoder().encode(raw.trim()) : null;
  return cachedSecret;
}

let cachedJwks: ReturnType<typeof import('jose').createRemoteJWKSet> | null = null;

/**
 * Remote JWK set for the project's published signing keys, or null when
 * SUPABASE_URL is unset. jose caches the keys and refreshes them on key
 * rotation (unknown kid), so JWKS resolution costs one HTTP fetch. The
 * endpoint is public — no service key is involved.
 */
export function getSupabaseJwks() {
  if (cachedJwks) return cachedJwks;

  const raw = process.env.SUPABASE_URL?.trim();
  if (!raw) return null;

  const base = raw.replace(/\/+$/, '');
  cachedJwks = createRemoteJWKSet(
    new URL(`${base}/auth/v1/.well-known/jwks.json`),
  );
  return cachedJwks;
}

/**
 * Startup gate: refuse to start when NO verifier can be configured. A
 * deployment needs at least one of:
 * - SUPABASE_JWT_SECRET (legacy HS256 token verification), or
 * - SUPABASE_URL (asymmetric tokens verified against the project JWKS).
 */
export function assertAuthConfigured(): void {
  if (getSupabaseJwks()) return;
  if (getSupabaseJwtSecret()) return;

  throw new AuthConfigError(
    'SUPABASE_URL / SUPABASE_JWT_SECRET',
    'the API cannot verify Supabase Auth tokens. Set SUPABASE_URL (access tokens are verified against the project JWKS) and/or SUPABASE_JWT_SECRET (legacy HS256 projects). The API refuses to start without either — authentication cannot be silently disabled.',
  );
}
