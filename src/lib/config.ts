/**
 * Feature flags shared by server and client code.
 *
 * Email verification is enforced: both Resend sending domains are verified,
 * so every email/password sign-up must open the emailed link before it can
 * sign in. Google accounts arrive verified.
 *
 * Security coupling: guest orders are shown inside an account by matching the
 * order email, and that match only happens for a verified address
 * (`src/lib/order-ownership.ts`) — otherwise anyone could register a
 * customer's email and read their order history.
 */
export const EMAIL_VERIFICATION_ENABLED = true;
