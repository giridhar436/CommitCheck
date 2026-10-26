import { NextRequest, NextResponse } from "next/server";
import { defaultUserRepository, handleOAuthCallback, OAuthProfile, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getAppBaseUrl } from "@/lib/env";

const OAUTH_STATE_COOKIE = "oauth_state";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const isMock = searchParams.get("mock") === "true";
  const appUrl = getAppBaseUrl(request.nextUrl.origin);

  // Development/Mock sign-in bypass for testing when live OAuth credentials are not provided
  if (isMock || (!process.env.GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID.startsWith("mock_"))) {
    const mockProfile: OAuthProfile = {
      provider: "github",
      providerId: "gh_demo_101",
      email: searchParams.get("email") || "freelancer@commitcheck.dev",
      name: searchParams.get("name") || "Alex Rivera",
      username: searchParams.get("username") || "alex-rivera-dev",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
      accessToken: "mock_gh_token_dev_123",
    };

    try {
      const result = await handleOAuthCallback(mockProfile, defaultUserRepository);
      const response = NextResponse.redirect(new URL(result.redirectUrl, request.url));
      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: result.sessionToken,
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
      });
      return response;
    } catch (err: any) {
      return NextResponse.redirect(
        new URL(`/?error=${encodeURIComponent(err.message)}`, request.url)
      );
    }
  }

  // Live GitHub OAuth Flow
  if (!code) {
    const clientId = process.env.GITHUB_CLIENT_ID!;
    const redirectUri = `${appUrl}/api/auth/github`;
    const oauthState = crypto.randomUUID();
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=read:user,user:email,repo&state=${oauthState}`;
    const authorizeResponse = NextResponse.redirect(githubAuthUrl);
    authorizeResponse.cookies.set({
      name: OAUTH_STATE_COOKIE,
      value: oauthState,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 10 * 60,
    });
    return authorizeResponse;
  }

  // CSRF protection: the state we issued must match the one the provider returned
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!state || state !== expectedState) {
    return NextResponse.redirect(new URL("/?error=oauth_state_mismatch", request.url));
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.redirect(new URL("/?error=github_token_exchange_failed", request.url));
    }

    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "User-Agent": "CommitCheck-App",
      },
    });
    const ghUser = await userRes.json();

    // Fetch primary verified email if not present in public profile
    let email = ghUser.email;
    if (!email) {
      const emailsRes = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          "User-Agent": "CommitCheck-App",
        },
      });
      const emails = await emailsRes.json();
      const primary = emails.find((e: any) => e.primary && e.verified);
      email = primary ? primary.email : `${ghUser.login}@users.noreply.github.com`;
    }

    const profile: OAuthProfile = {
      provider: "github",
      providerId: String(ghUser.id),
      email,
      name: ghUser.name || ghUser.login,
      username: ghUser.login,
      avatarUrl: ghUser.avatar_url,
      accessToken: tokenData.access_token,
    };

    const result = await handleOAuthCallback(profile, defaultUserRepository);
    const response = NextResponse.redirect(new URL(result.redirectUrl, request.url));
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: result.sessionToken,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
    });
    response.cookies.delete(OAUTH_STATE_COOKIE);
    return response;
  } catch (err: any) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(err.message)}`, request.url)
    );
  }
}
