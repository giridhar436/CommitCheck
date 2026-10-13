import { BadRequestException, Injectable, Logger } from '@nestjs/common';

/**
 * Minimal Supabase Auth Admin-API client (Phase 15).
 *
 * Used for exactly one thing: resolving a member's email to their Supabase
 * Auth user id when an admin adds them to a project. There is no other
 * surface on purpose — this key can read all user data.
 *
 * Configuration (optional — the members API degrades with a clear error
 * when unset):
 *   SUPABASE_URL               e.g. https://<project>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  service-role key — SECRET, server-side only
 *
 * SECURITY invariants:
 *  - The service key is never logged, never returned in responses, and
 *    never appears in error messages (status codes only).
 *  - Emails are matched case-insensitively by scanning list pages (documented
 *    limitation: up to MAX_SCAN_USERS users) — no undocumented query params.
 */
@Injectable()
export class SupabaseAdminService {
  private static readonly MAX_SCAN_PAGES = 10;
  private static readonly PAGE_SIZE = 50;

  private readonly logger = new Logger(SupabaseAdminService.name);
  private readonly config: { url: string; serviceKey: string } | null;

  constructor() {
    const url = process.env.SUPABASE_URL?.trim();
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    this.config =
      url && serviceKey
        ? { url: url.replace(/\/+$/, ''), serviceKey }
        : null;
  }

  get configured(): boolean {
    return this.config !== null;
  }

  get status(): { configured: boolean; reason: string | null } {
    return this.config
      ? { configured: true, reason: null }
      : {
          configured: false,
          reason:
            'Supabase Auth admin access is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).',
        };
  }

  /**
   * Resolves an email to its Supabase Auth user. Returns null when no user
   * matches; throws a sanitized BadRequest when the lookup cannot run.
   */
  async findUserByEmail(
    email: string,
  ): Promise<{ id: string; email: string } | null> {
    if (!this.config) {
      throw new BadRequestException(
        'Member lookup requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY configuration',
      );
    }
    const { url, serviceKey } = this.config;
    const headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    };
    const needle = email.trim().toLowerCase();

    try {
      for (let page = 1; page <= SupabaseAdminService.MAX_SCAN_PAGES; page++) {
        const response = await fetch(
          `${url}/auth/v1/admin/users?per_page=${SupabaseAdminService.PAGE_SIZE}&page=${page}`,
          { headers, signal: AbortSignal.timeout(8000) },
        );
        if (!response.ok) {
          throw new Error(`Supabase Auth admin lookup failed (status ${response.status})`);
        }
        const body = (await response.json()) as { users?: Array<{ id?: unknown; email?: unknown }> };
        const users = Array.isArray(body.users) ? body.users : [];
        for (const user of users) {
          if (
            typeof user.id === 'string' &&
            typeof user.email === 'string' &&
            user.email.toLowerCase() === needle
          ) {
            return { id: user.id, email: user.email };
          }
        }
        if (users.length < SupabaseAdminService.PAGE_SIZE) break;
      }
      return null;
    } catch (error) {
      // Timeout/abort classification keeps the message free of config values.
      const detail =
        error instanceof Error && error.name === 'TimeoutError'
          ? 'timed out'
          : error instanceof Error && error.message.startsWith('Supabase Auth admin lookup failed')
            ? error.message
            : 'unreachable';
      this.logger.warn(`Supabase Auth admin lookup failed: ${detail}`);
      throw new BadRequestException('Member lookup against Supabase Auth failed — verify SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY configuration');
    }
  }
}
