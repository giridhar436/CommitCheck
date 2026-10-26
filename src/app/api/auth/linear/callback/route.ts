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

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/freelancer/settings?error=${encodeURIComponent(error || "Linear authorization was denied")}`, request.url)
    );
  }

  const expectedState = request.cookies.get(LINEAR_STATE_COOKIE)?.value;
  const isMock = searchParams.get("mock") === "true";
  if (!isMock && expectedState && (!state || state !== expectedState)) {
    return NextResponse.redirect(
      new URL("/freelancer/settings?error=oauth_state_mismatch", request.url)
    );
  }

  const appUrl = getAppBaseUrl(request.nextUrl.origin);
  const redirectUri = `${appUrl}/api/auth/linear/callback`;

  try {
    await connectLinearWorkspace(
      session.userId,
      code,
      redirectUri,
      defaultUserRepository,
      defaultLinearService
    );

    const response = NextResponse.redirect(new URL("/freelancer/settings?success=linear_connected", request.url));
    response.cookies.delete(LINEAR_STATE_COOKIE);
    return response;
  } catch (err: any) {
    return NextResponse.redirect(
      new URL(`/freelancer/settings?error=${encodeURIComponent(err.message)}`, request.url)
    );
  }
}
