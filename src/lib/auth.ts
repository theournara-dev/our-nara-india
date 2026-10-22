import "server-only";
import { headers } from "next/headers";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, username } from "better-auth/plugins";
import { db } from "@/lib/db";
import { ac, roles } from "@/lib/permissions";
import { EMAIL_VERIFICATION_ENABLED } from "@/lib/config";
import { sendPasswordResetLink, sendVerificationLink } from "@/lib/email";

/**
 * Base URL for auth callbacks and CSRF origin checks. Better Auth derives its
 * trusted origins from this, so it must match the origin the browser actually
 * visits.
 *
 * Local dev runs on a random free port (`next dev --port 0`), so a fixed
 * origin can't be used. The dynamic config derives the base URL from each
 * request's Host header and validates it against `allowedHosts` wildcards —
 * `localhost:*` matches any port. Production/preview origins are listed
 * explicitly (env vars win there).
 */
const baseURL = {
  allowedHosts: [
    "localhost:*",
    "127.0.0.1:*",
    "our-nara.com",
    "www.our-nara.com",
    "our-nara.co.kr",
    "www.our-nara.co.kr",
    "our-nara-india.vercel.app",
    "*.vercel.app",
  ],
  fallback:
    process.env.BETTER_AUTH_PRODUCTION_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://our-nara-india.vercel.app",
};

/** Every origin the app is served from (local dev + production + previews). */
const prodUrl =
  process.env.BETTER_AUTH_PRODUCTION_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
const trustedOrigins = [
  prodUrl,
  // Custom production domains + the Vercel deployment domain.
  "https://www.our-nara.com",
  "https://our-nara.com",
  "https://www.our-nara.co.kr",
  "https://our-nara.co.kr",
  "https://our-nara-india.vercel.app",
  process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : null,
  process.env.VERCEL_BRANCH_URL
    ? `https://${process.env.VERCEL_BRANCH_URL}`
    : null,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  // Any local port (dev runs on a random free port).
  "http://localhost:*",
  "http://127.0.0.1:*",
].filter((o): o is string => Boolean(o));

export const auth = betterAuth({
  baseURL,
  trustedOrigins,
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // Sign-in stays blocked until the address is verified.
    requireEmailVerification: EMAIL_VERIFICATION_ENABLED,
    // Link in the email points at /reset-password?token=… (see the client).
    sendResetPassword: async ({ user, url }) => {
      // Never await: the auth endpoint must not reveal whether the address
      // exists through response timing.
      void sendPasswordResetLink(user.email, user.name, url).catch((err) => {
        console.error("[auth.email] password reset email failed", err);
      });
    },
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
    // A reset means the old sessions may be compromised.
    revokeSessionsOnPasswordReset: true,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      void sendVerificationLink(user.email, user.name, url).catch((err) => {
        console.error("[auth.email] verification email failed", err);
      });
    },
    // Send the link at sign-up and re-send when an unverified user tries to
    // sign in.
    sendOnSignUp: EMAIL_VERIFICATION_ENABLED,
    sendOnSignIn: EMAIL_VERIFICATION_ENABLED,
    // The link signs the user in and lands on the callback URL.
    autoSignInAfterVerification: EMAIL_VERIFICATION_ENABLED,
    expiresIn: 60 * 60, // 1 hour
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
  rateLimit: {
    enabled: true,
    window: 10, // generic default: 100 requests / 10s per client IP
    max: 100,
    customRules: {
      // Better Auth ships with very aggressive defaults: auth endpoints are
      // capped at 3 req / 10s and OTP sends at 3 req / 60s. Those lock out
      // legitimate users during normal use (e.g. a couple of mistyped logins
      // immediately 429s the whole site). Relax them to reasonable limits.
      // "*" is a wildcard, so "/sign-in/*" covers /sign-in/email, /username,
      // /social, etc. Per-client IP buckets still apply (Next.js forwards the
      // real client IP via x-forwarded-for).
      "/sign-in/*": { window: 60, max: 10 },
      "/sign-up/*": { window: 60, max: 10 },
      "/change-password": { window: 60, max: 5 },
      "/change-email": { window: 60, max: 5 },
      "/request-password-reset": { window: 60, max: 5 },
      "/send-verification-email": { window: 60, max: 5 },
    },
  },
  user: {
    additionalFields: {
      firstName: { type: "string", required: false },
      lastName: { type: "string", required: false },
      country: { type: "string", required: false },
      addressLine1: { type: "string", required: false },
      addressLine2: { type: "string", required: false },
      city: { type: "string", required: false },
      state: { type: "string", required: false },
      postal: { type: "string", required: false },
      telephoneCode: { type: "string", required: false },
      telephone: { type: "string", required: false },
      mobileCode: { type: "string", required: false },
      mobile: { type: "string", required: false },
      permissions: { type: "json", required: false },
    },
  },
  plugins: [
    username({
      minUsernameLength: 4,
      maxUsernameLength: 16,
      // Lowercase letters + numbers only (validated after normalization, so
      // "ABC123" is accepted and stored as "abc123").
      usernameValidator: (username) => /^[a-z0-9]+$/.test(username),
      validationOrder: { username: "post-normalization" },
    }),
    admin({
      ac,
      roles,
      defaultRole: "normal",
      adminRoles: ["admin"],
      // Shown to a blocked user when they try to sign in (the admin plugin
      // throws this from the session.create hook).
      bannedUserMessage:
        "Your account has been blocked. If you believe this is a mistake, please contact support.",
    }),
  ],
});

/**
 * Resolve the current session and throw if the user isn't an admin. Used by
 * admin server actions to guard mutations.
 */
export async function requireAdmin() {
  let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch {
    session = null;
  }
  if (session?.user?.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return session;
}

/**
 * Resolve the current session and throw if no user is signed in. Used by
 * server actions that require an account (reviews, product questions).
 *
 * This checks sign-in only. Better Auth blocks sign-in for unverified
 * addresses, so a session already implies a verified email.
 */
export async function requireUser() {
  let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch {
    session = null;
  }
  if (!session?.user) {
    throw new Error("You must be signed in to do that.");
  }
  return session;
}

/**
 * Return the signed-in user, or null. Used by server components that render
 * different UI depending on whether the visitor is authenticated.
 */
export async function getCurrentUser() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user ?? null;
  } catch {
    return null;
  }
}
