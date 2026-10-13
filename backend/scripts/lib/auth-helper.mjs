/**
 * Shared auth test helper (Phase 15, dev-only).
 *
 * The embedded-PostgreSQL test environment has no Supabase Auth server, so
 * the suites act as their own identity provider: they mint real HS256
 * access tokens with the same shape Supabase Auth issues (sub/email claims)
 * using a dedicated test-only signing secret. The backend verifies these
 * tokens with the exact same jose path it uses in production — the only
 * substitution is who signs the token.
 */
import { SignJWT } from 'jose';

/** Test-only secret — never a real credential. */
export const TEST_JWT_SECRET = 'commitcheck-test-only-signing-secret';

/** Primary identity used by every regression suite (owns the seeded data). */
export const USER_A = 'b1111111-1111-4111-8111-111111111111';
/** Secondary identities for isolation/RBAC tests. */
export const USER_B = 'a2222222-2222-4222-8222-222222222222';
export const USER_B_EMAIL = 'member-b@commitcheck.test';
export const USER_C = 'a2323232-3232-4323-8323-323232323232';
export const USER_D = 'a3333333-3333-4333-8333-333333333333';

/** Mints an HS256 access token for a user, mirroring Supabase's claim shape. */
export async function signToken(
  userId,
  email = 'rahul@pixelforge.io',
  { expiresIn = '1h' } = {},
) {
  return new SignJWT({ email, role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setAudience('authenticated')
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(TEST_JWT_SECRET));
}
