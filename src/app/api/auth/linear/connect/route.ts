import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, defaultUserRepository } from "@/lib/auth";
import { getAppBaseUrl } from "@/lib/env";
import { defaultLinearService, connectLinearWorkspace } from "@/lib/linear";
import { LINEAR_STATE_COOKIE } from "../route";

export async function GET(request: NextRequest) {
  const session = await getCurrentSession();

  if (!session || session.role !== "FREELANCER") {
    return NextResponse.redirect(new URL("/?auth=required&role=FREELANCER", request.url));
  }

  const appUrl = getAppBaseUrl(request.nextUrl.origin);
  const redirectUri = `${appUrl}/api/auth/linear/callback`;

  // Dev / Mock connection support
  const isMock = request.nextUrl.searchParams.get("mock") === "true";
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
      return NextResponse.redirect(new URL("/freelancer/settings?success=linear_connected", request.url));
    } catch (err: any) {
      return NextResponse.redirect(
        new URL(`/freelancer/settings?error=${encodeURIComponent(err.message)}`, request.url)
      );
    }
  }

  // Live Linear OAuth redirect with state CSRF protection
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
