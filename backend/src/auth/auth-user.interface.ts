/**
 * Identity established by SupabaseAuthGuard after token verification.
 * Attached to the request as `authUser`; consumed via @CurrentUser().
 *
 * Only fields minted by Supabase itself (claims of a verified token) may
 * appear here — client-supplied userId/orgId values are never trusted
 * for authorization.
 */
export interface AuthUser {
  /** Supabase auth user id (`sub` claim, a UUID). */
  id: string;
  /** Email claim, when present. */
  email: string | null;
}
