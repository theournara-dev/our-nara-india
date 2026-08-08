import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Better Auth's default session cookie name (no custom cookie config in auth.ts).
const SESSION_COOKIE = "better-auth.session_token";

/**
 * Edge middleware. This only checks that a session cookie *exists* — it cannot
 * validate the session against the DB (edge runtime). The authoritative check
 * happens server-side in the account/admin layouts, which call
 * `auth.api.getSession()` and redirect if the session is missing/expired.
 *
 * - `/account` and `/admin` require a session cookie; without one we bounce to
 *   `/login`.
 * - `/login` and `/join` are hidden once a session cookie exists. Redirecting
 *   here (instead of the pages' client-side `useSession()` effect) removes the
 *   “flash” of the logged-out header / form that appears while the client
 *   fetches the session.
 *
 * Loop safety: a stale cookie (present, but its server session is gone) would
 * bounce login → account → login forever. When the account/admin layouts find
 * an invalid session they redirect to `/login?session=expired`; we clear the
 * stale cookie on that request so the next `/login` is served normally.
 * (Layouts can't modify cookies themselves — Next.js only allows that in
 * middleware, route handlers and server actions.)
 */
export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname, searchParams } = request.nextUrl;

  const requiresAuth =
    pathname.startsWith("/account") || pathname.startsWith("/admin");
  const isAuthPage = pathname === "/login" || pathname === "/join";

  if (!sessionCookie && requiresAuth) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (sessionCookie && isAuthPage) {
    // A layout bounced an invalid session here — drop the stale cookie and
    // show login instead of looping back to /account.
    if (searchParams.get("session") === "expired") {
      const res = NextResponse.redirect(new URL("/login", request.url));
      res.cookies.set(SESSION_COOKIE, "", {
        maxAge: 0,
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
      return res;
    }
    return NextResponse.redirect(new URL("/account", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/admin/:path*", "/login", "/join"],
};
