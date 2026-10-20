import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, defaultUserRepository } from "@/lib/auth";
import {
  defaultLinearService,
  connectLinearWorkspace,
  disconnectLinearWorkspace,
} from "@/lib/linear";

export const LINEAR_STATE_COOKIE = "linear_oauth_state";

export async function GET(request: NextRequest) {
  const session = await getCurrentSession();

  if (!session || session.role !== "FREELANCER") {
    return NextResponse.redirect(new URL("/?auth=required&role=FREELANCER", request.url));
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const redirectUri = `${appUrl}/api/auth/linear/callback`;
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // If error is returned from Linear
  if (error) {
    return NextResponse.redirect(
      new URL(`/freelancer/settings?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  // If authorization code is provided, handle OAuth callback / exchange
  if (code) {
    const expectedState = request.cookies.get(LINEAR_STATE_COOKIE)?.value;
    const isMock = searchParams.get("mock") === "true";

    if (!isMock && expectedState && (!state || state !== expectedState)) {
      return NextResponse.redirect(
        new URL("/freelancer/settings?error=oauth_state_mismatch", request.url)
      );
    }

    try {
      await connectLinearWorkspace(
        session.userId,
        code,
        redirectUri,
        defaultUserRepository,
        defaultLinearService
      );

      const response = NextResponse.redirect(
        new URL("/freelancer/settings?success=linear_connected", request.url)
      );
      response.cookies.delete(LINEAR_STATE_COOKIE);
      return response;
    } catch (err: any) {
      return NextResponse.redirect(
        new URL(`/freelancer/settings?error=${encodeURIComponent(err.message)}`, request.url)
      );
    }
  }

  // Development / Mock connection support
  const isMock = searchParams.get("mock") === "true";
  const clientId = process.env.LINEAR_CLIENT_ID;

  if (isMock || (!clientId || clientId.startsWith("mock_"))) {
    try {
      await connectLinearWorkspace(
        session.userId,
        "mock_code_dev",
        redirectUri,
        defaultUserRepository,
        defaultLinearService
      );
      return NextResponse.redirect(
        new URL("/freelancer/settings?success=linear_connected", request.url)
      );
    } catch (err: any) {
      return NextResponse.redirect(
        new URL(`/freelancer/settings?error=${encodeURIComponent(err.message)}`, request.url)
      );
    }
  }

  // Live Linear OAuth flow initiation
  const oauthState = crypto.randomUUID();
  const authUrl = defaultLinearService.getAuthorizationUrl(redirectUri, oauthState);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set({
    name: LINEAR_STATE_COOKIE,
    value: oauthState,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 10 * 60,
  });
  return response;
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();

  if (!session || session.role !== "FREELANCER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await disconnectLinearWorkspace(session.userId, defaultUserRepository);
    return NextResponse.redirect(
      new URL("/freelancer/settings?success=linear_disconnected", request.url)
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  return POST(request);
}
