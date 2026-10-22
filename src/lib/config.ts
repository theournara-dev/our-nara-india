/**
 * Feature flags shared by server and client code.
 *
 * Email verification is currently disabled because the Resend sending domain
 * isn't verified yet. Flip this to `true` to re-enable the full
 * sign-up → verify-email → sign-in flow (the email-otp plugin and the
 * join/login verification UI are all still wired up and ready).
 *
 * Security coupling: guest orders are shown inside an account by matching the
 * order email, and that match only happens for a verified address
 * (`src/lib/order-ownership.ts`). While this flag is false, guest orders stay
 * out of every account — otherwise anyone could register a customer's email
 * and read their order history. Turning verification back on restores it.
 */
export const EMAIL_VERIFICATION_ENABLED = false;
