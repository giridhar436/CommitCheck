import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, defaultUserRepository } from "@/lib/auth";
import { defaultLinearService, connectLinearWorkspace } from "@/lib/linear";

export async function GET(request: NextRequest) {
  const session = await getCurrentSession();

  if (!session || session.role !== "FREELANCER") {
    return NextResponse.redirect(new URL("/?auth=required&role=FREELANCER", request.url));
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
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

  // Live Linear OAuth redirect
  const authUrl = defaultLinearService.getAuthorizationUrl(redirectUri, session.userId);
  return NextResponse.redirect(authUrl);
}
