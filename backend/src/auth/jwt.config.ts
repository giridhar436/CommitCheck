/**
 * Authentication configuration (Phase 15).
 *
 * Supabase Auth is the sole identity source: it issues HS256 access tokens
 * signed with the project JWT secret. The backend never authenticates users
 * itself — it only verifies those tokens to establish identity. This file is
 * therefore deliberately tiny: one secret, loaded once, never logged.
 */

/** Thrown when the JWT secret is missing/blank. Mapped to a clear startup failure. */
export class AuthConfigError extends Error {
  readonly configKey: string;

  constructor(configKey: string, reason: string) {
    super(`Configuration error: ${configKey} — ${reason}`);
    this.name = 'AuthConfigError';
    this.configKey = configKey;
  }
}

let cachedSecret: Uint8Array | undefined;

/**
 * Returns the Supabase JWT secret as bytes for jose's HS256 verification.
 * Fails fast (instead of silently disabling authentication) when unset.
 * Never throws after the first successful load.
 */
export function getSupabaseJwtSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;

  const raw = process.env.SUPABASE_JWT_SECRET;
  if (!raw || raw.trim() === '') {
    throw new AuthConfigError(
      'SUPABASE_JWT_SECRET',
      'required so the API can verify Supabase Auth tokens. Set it to your Supabase project JWT secret (Dashboard → Settings → API). The API refuses to start without it — authentication cannot be silently disabled.',
    );
  }

  cachedSecret = new TextEncoder().encode(raw.trim());
  return cachedSecret;
}
