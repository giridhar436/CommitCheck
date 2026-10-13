import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtVerify } from 'jose';
import { getSupabaseJwtSecret } from './jwt.config';
import type { AuthUser } from './auth-user.interface';

/** Supabase access tokens carry a UUID in `sub`; reject anything else early
 * so it can never reach a `::uuid` database column (which would 500). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Global authentication guard (Phase 15): verifies the Supabase Auth
 * access token on every request before anything else runs.
 *
 * - No/blank Bearer header → 401 "Authentication required".
 * - Signature/expiry/format failure → 401 "Invalid or expired token"
 *   (deliberately uniform — verification internals are never echoed, so
 *   callers cannot distinguish malformed vs expired vs wrong-tenant).
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
      const { payload } = await jwtVerify(token, getSupabaseJwtSecret(), {
        algorithms: ['HS256'],
      });

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
}
