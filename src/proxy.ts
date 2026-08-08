import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Edge middleware. This only checks that a session cookie *exists* — it cannot
 * validate the session against the DB (edge runtime). The authoritative check
 * happens server-side in the account/admin layouts, which call
 * `auth.api.getSession()` and redirect if the session is missing/expired.
 *
 * We deliberately do NOT redirect logged-in users away from /login and /join
 * here: a stale cookie would bounce them login → account → login forever.
 * Those pages handle the "already signed in" redirect client-side instead.
 */
export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  // Account and admin areas require a session.
  if (
    !sessionCookie &&
    (pathname.startsWith("/account") || pathname.startsWith("/admin"))
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/admin/:path*"],
};
