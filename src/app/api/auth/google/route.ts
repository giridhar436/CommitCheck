import { NextRequest, NextResponse } from "next/server";
import { defaultUserRepository, handleOAuthCallback, OAuthProfile, SESSION_COOKIE_NAME } from "@/lib/auth";

const OAUTH_STATE_COOKIE = "oauth_state";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const isMock = searchParams.get("mock") === "true";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  // Development/Mock sign-in bypass for testing when live OAuth credentials are not provided
  if (isMock || (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID.startsWith("mock_"))) {
    const mockProfile: OAuthProfile = {
      provider: "google",
      providerId: "goog_demo_202",
      email: searchParams.get("email") || "client@venturecap.com",
      name: searchParams.get("name") || "Elena Rostova",
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80",
      accessToken: "mock_google_token_dev_456",
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

  // Live Google OAuth Flow
  if (!code) {
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const redirectUri = `${appUrl}/api/auth/google`;
    const oauthState = crypto.randomUUID();
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=openid%20profile%20email&access_type=online&state=${oauthState}`;
    const authorizeResponse = NextResponse.redirect(googleAuthUrl);
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
    const redirectUri = `${appUrl}/api/auth/google`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.redirect(new URL("/?error=google_token_exchange_failed", request.url));
    }

    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });
    const googUser = await userRes.json();

    const profile: OAuthProfile = {
      provider: "google",
      providerId: googUser.sub,
      email: googUser.email,
      name: googUser.name,
      avatarUrl: googUser.picture,
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
