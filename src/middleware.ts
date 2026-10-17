import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./lib/auth/session";
import { checkRouteAccess } from "./lib/auth/service";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(sessionCookie);
  const userRole = session?.role ?? null;

  const access = checkRouteAccess(pathname, userRole);

  if (!access.allowed && access.redirectUrl) {
    const redirectUrl = new URL(access.redirectUrl, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/freelancer/:path*",
    "/client/:path*",
  ],
};
