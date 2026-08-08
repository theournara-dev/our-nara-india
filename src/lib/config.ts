/**
 * Feature flags shared by server and client code.
 *
 * Email verification is currently disabled because the Resend sending domain
 * isn't verified yet. Flip this to `true` to re-enable the full
 * sign-up → verify-email → sign-in flow (the email-otp plugin and the
 * join/login verification UI are all still wired up and ready).
 */
export const EMAIL_VERIFICATION_ENABLED = false;
