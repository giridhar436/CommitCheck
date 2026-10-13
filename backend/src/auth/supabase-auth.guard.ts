import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { decodeProtectedHeader, jwtVerify } from 'jose';
import { getSupabaseJwks, getSupabaseJwtSecret } from './jwt.config';
import type { AuthUser } from './auth-user.interface';

/** Supabase access tokens carry a UUID in `sub`; reject anything else early
 * so it can never reach a `::uuid` database column (which would 500). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Global authentication guard (Phase 15): verifies the Supabase Auth
 * access token on every request before anything else runs.
 *
 * Verification is routed by the token's `alg` header claim (never by the
 * caller's input beyond that):
 *
 * - `HS256` — legacy Supabase projects: verify against the shared project
 *   JWT secret (`SUPABASE_JWT_SECRET`). Only the symmetric algorithm is
 *   accepted here, so an attacker cannot downgrade an asymmetric token.
 * - any other algorithm (ES256/RS256/…) — current Supabase projects: verify
 *   against the project's published JWKS (`SUPABASE_URL`). jose binds each
 *   key to its published algorithm, so there is no algorithm-confusion
 *   surface; `alg: none` has no verifier and always fails.
 *
 * - No/blank Bearer header → 401 "Authentication required".
 * - Any verification failure → 401 "Invalid or expired token" (deliberately
 *   uniform — verification internals are never echoed, so callers cannot
 *   distinguish malformed vs expired vs wrong-tenant).
 * - On success the token's `sub`/`email` claims are attached as
 *   `request.authUser`; downstream code must use these values (via
 *   @CurrentUser()) and never client-supplied user ids.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers?.authorization;

    if (typeof header !== 'string' || !/^Bearer\s+\S+/i.test(header)) {
      throw new UnauthorizedException('Authentication required');
    }

    const token = header.replace(/^Bearer\s+/i, '').trim();

    try {
      const payload = await this.verify(token);

      const subject = payload.sub;
      if (typeof subject !== 'string' || !UUID_RE.test(subject)) {
        throw new Error('token subject is not a user id');
      }

      const user: AuthUser = {
        id: subject,
        email: typeof payload.email === 'string' ? payload.email : null,
      };
      request.authUser = user;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /** Verify the token with the verifier its algorithm requires. Throws on
   * any failure; the caller maps everything to the uniform 401. */
  private async verify(token: string) {
    const protectedHeader = decodeProtectedHeader(token);
    if (protectedHeader.alg === 'HS256') {
      const secret = getSupabaseJwtSecret();
      if (!secret) throw new Error('HS256 token but no SUPABASE_JWT_SECRET configured');
      return (await jwtVerify(token, secret, { algorithms: ['HS256'] })).payload;
    }

    const jwks = getSupabaseJwks();
    if (!jwks) throw new Error(`token alg ${String(protectedHeader.alg)} requires SUPABASE_URL (JWKS) configuration`);
    // Algorithm deliberately unrestricted: jose selects only JWKS keys whose
    // published alg matches the token's, so each key verifies exactly the
    // algorithm Supabase publishes for it.
    return (await jwtVerify(token, jwks)).payload;
  }
}
