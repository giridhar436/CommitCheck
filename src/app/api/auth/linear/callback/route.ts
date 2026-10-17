import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession, defaultUserRepository } from "@/lib/auth";
import { defaultLinearService, connectLinearWorkspace } from "@/lib/linear";

export async function GET(request: NextRequest) {
  const session = await getCurrentSession();

  if (!session || session.role !== "FREELANCER") {
    return NextResponse.redirect(new URL("/?auth=required&role=FREELANCER", request.url));
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/freelancer/settings?error=${encodeURIComponent(error || "Linear authorization was denied")}`, request.url)
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const redirectUri = `${appUrl}/api/auth/linear/callback`;

  try {
    await connectLinearWorkspace(
      session.userId,
      code,
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
