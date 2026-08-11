import "server-only";
import { headers } from "next/headers";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, emailOTP, username } from "better-auth/plugins";
import { db } from "@/lib/db";
import { ac, roles } from "@/lib/permissions";
import { EMAIL_VERIFICATION_ENABLED } from "@/lib/config";
import { sendVerificationCode } from "@/lib/email";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // Block sign-in until the email is verified (disabled until the email
    // provider is ready).
    requireEmailVerification: EMAIL_VERIFICATION_ENABLED,
  },
  emailVerification: {
    // Auto-send a fresh OTP when a blocked user attempts to sign in.
    sendOnSignIn: EMAIL_VERIFICATION_ENABLED,
    // Sign the user in automatically once they verify the OTP.
    autoSignInAfterVerification: EMAIL_VERIFICATION_ENABLED,
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
      "/email-otp/send-verification-otp": { window: 60, max: 5 },
      "/email-otp/request-password-reset": { window: 60, max: 5 },
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
    emailOTP({
      // Send the 6-digit code via the shared email template.
      sendVerificationOTP: async ({ email, otp }) => {
        await sendVerificationCode(email, otp);
      },
      // Use OTP (code) instead of the default verification link.
      overrideDefaultEmailVerification: true,
      expiresIn: 600, // 10 minutes
      allowedAttempts: 5,
      // Cooldown: at most one code per 60s per email.
      rateLimit: { window: 60, max: 1 },
      sendVerificationOnSignUp: false, // the join wizard sends it explicitly
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
