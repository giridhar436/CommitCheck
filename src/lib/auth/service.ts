import { createSessionToken } from "./session";
import { AuthSession, AuthUser, OAuthProfile, OAuthProvider, Role, RouteAccessResult, UserRepository } from "./types";

export interface AuthCallbackResult {
  user: AuthUser;
  session: AuthSession;
  sessionToken: string;
  redirectUrl: string;
}

export function roleForProvider(provider: OAuthProvider): Role {
  switch (provider) {
    case "github":
      return "FREELANCER";
    case "google":
      return "CLIENT";
    default:
      throw new Error(`Unsupported OAuth provider: ${provider}`);
  }
}

export function defaultDashboardForRole(role: Role): string {
  switch (role) {
    case "FREELANCER":
      return "/freelancer";
    case "CLIENT":
      return "/client";
  }
}

export async function handleOAuthCallback(
  profile: OAuthProfile,
  repository: UserRepository
): Promise<AuthCallbackResult> {
  const role = roleForProvider(profile.provider);

  const user = await repository.upsertOAuthUser(profile, role);

  const sessionData = {
    userId: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
  };

  const sessionToken = await createSessionToken(sessionData);

  return {
    user,
    session: {
      ...sessionData,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    },
    sessionToken,
    redirectUrl: defaultDashboardForRole(user.role),
  };
}

export function checkRouteAccess(
  pathname: string,
  userRole: Role | null
): RouteAccessResult {
  // Freelancer dashboard route gating
  if (pathname.startsWith("/freelancer")) {
    if (!userRole) {
      return {
        allowed: false,
        redirectUrl: `/login?auth=required&role=FREELANCER&redirect=${encodeURIComponent(pathname)}`,
      };
    }
    if (userRole !== "FREELANCER") {
      return {
        allowed: false,
        redirectUrl: "/client",
      };
    }
    return { allowed: true };
  }

  // Client dashboard route gating
  if (pathname.startsWith("/client")) {
    if (!userRole) {
      return {
        allowed: false,
        redirectUrl: `/login?auth=required&role=CLIENT&redirect=${encodeURIComponent(pathname)}`,
      };
    }
    if (userRole !== "CLIENT") {
      return {
        allowed: false,
        redirectUrl: "/freelancer",
      };
    }
    return { allowed: true };
  }

  // Public routes (landing, api, assets)
  return { allowed: true };
}

import { getAppBaseUrl } from "../env";

/**
 * Returns the canonical callback URL for GitHub OAuth.
 */
export function getGitHubCallbackUrl(baseUrl?: string): string {
  const base = baseUrl ? baseUrl.replace(/\/+$/, "") : getAppBaseUrl();
  return `${base}/api/auth/github`;
}

/**
 * Returns the canonical callback URL for Google OAuth.
 */
export function getGoogleCallbackUrl(baseUrl?: string): string {
  const base = baseUrl ? baseUrl.replace(/\/+$/, "") : getAppBaseUrl();
  return `${base}/api/auth/google`;
}

/**
 * Returns the canonical callback URL for Linear OAuth.
 */
export function getLinearCallbackUrl(baseUrl?: string): string {
  const base = baseUrl ? baseUrl.replace(/\/+$/, "") : getAppBaseUrl();
  return `${base}/api/auth/linear/callback`;
}

export function getOAuthAuthorizationUrl(
  provider: OAuthProvider,
  redirectUri?: string,
  state?: string
): string {
  const resolvedRedirectUri =
    redirectUri ||
    (provider === "github" ? getGitHubCallbackUrl() : getGoogleCallbackUrl());

  if (provider === "github") {
    const clientId = process.env.GITHUB_CLIENT_ID || "";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: resolvedRedirectUri,
      scope: "read:user user:email repo",
      ...(state ? { state } : {}),
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  if (provider === "google") {
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: resolvedRedirectUri,
      response_type: "code",
      scope: "openid profile email",
      access_type: "online",
      ...(state ? { state } : {}),
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  throw new Error(`Unsupported provider: ${provider}`);
}
