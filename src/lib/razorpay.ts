import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import type { SiteVersion } from "@/lib/site-version";

/**
 * Razorpay helpers. Server-only (see the `import "server-only"` guard) so API
 * keys never leak into the client bundle.
 *
 * Each store version has its OWN Razorpay account. Credentials are read per
 * version from env:
 *   local  → RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET
 *   global → RAZORPAY_KEY_ID_GLOBAL / RAZORPAY_KEY_SECRET_GLOBAL /
 *            RAZORPAY_WEBHOOK_SECRET_GLOBAL
 *
 * Always resolve the version from the ORDER (not the request) when picking an
 * account, so a Razorpay order is created/verified/reconciled against the
 * account that owns it.
 *
 * All amounts are integer minor units (paise/cents), which is exactly what
 * Razorpay expects for its `amount` field — pass stored values through as-is.
 */

export class RazorpayError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "RazorpayError";
  }
}

/** Env var names holding each version's Razorpay credentials. */
const ENV_KEYS: Record<
  SiteVersion,
  { id: string; secret: string; webhook: string }
> = {
  local: {
    id: "RAZORPAY_KEY_ID",
    secret: "RAZORPAY_KEY_SECRET",
    webhook: "RAZORPAY_WEBHOOK_SECRET",
  },
  global: {
    id: "RAZORPAY_KEY_ID_GLOBAL",
    secret: "RAZORPAY_KEY_SECRET_GLOBAL",
    webhook: "RAZORPAY_WEBHOOK_SECRET_GLOBAL",
  },
};

export interface RazorpayAccount {
  keyId: string;
  keySecret: string;
  /** Optional; absent until the account's webhook is configured. */
  webhookSecret?: string;
}

/** Resolve the Razorpay credentials for a store version. */
export function razorpayAccountFor(version: SiteVersion): RazorpayAccount {
  const keys = ENV_KEYS[version];
  const keyId = process.env[keys.id];
  const keySecret = process.env[keys.secret];
  if (!keyId || !keySecret) {
    throw new RazorpayError(
      `Missing Razorpay credentials for the ${version} store (${keys.id} / ${keys.secret}).`,
    );
  }
  return { keyId, keySecret, webhookSecret: process.env[keys.webhook] };
}

/** True when a version has Razorpay credentials configured. */
export function hasRazorpayCredentials(version: SiteVersion): boolean {
  const keys = ENV_KEYS[version];
  return Boolean(process.env[keys.id] && process.env[keys.secret]);
}

/** Lazily-constructed Razorpay clients, one per version. */
const clients = new Map<SiteVersion, Razorpay>();

export function getRazorpay(version: SiteVersion = "local"): Razorpay {
  const existing = clients.get(version);
  if (existing) return existing;
  const { keyId, keySecret } = razorpayAccountFor(version);
  const client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  clients.set(version, client);
  return client;
}

export interface CreateOrderInput {
  /** Store version whose account should create the Razorpay order. */
  version: SiteVersion;
  orderId: string;
  amountMinor: number;
  currency?: string;
}

/**
 * Create a Razorpay "order" for a checkout. `receipt` is your internal order
 * reference and comes back on webhooks so we can reconcile it.
 */
export async function createRazorpayOrder({
  version,
  orderId,
  amountMinor,
  currency = "INR",
}: CreateOrderInput) {
  return getRazorpay(version).orders.create({
    amount: amountMinor,
    currency,
    receipt: orderId,
    notes: { internalOrderId: orderId },
  });
}

/** Constant-time string comparison (guards against timing side-channels). */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Verify a Razorpay webhook signature (HMAC-SHA256 of the raw request body
 * using the version's webhook secret). Always verify before trusting a payload.
 */
export function verifyWebhookSignature(
  body: string,
  signature: string | null | undefined,
  version: SiteVersion,
): boolean {
  const secret = process.env[ENV_KEYS[version].webhook];
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  return safeEqual(signature, expected);
}

/**
 * Verify a webhook against EVERY configured account's secret and return the
 * version that matched (or null). Lets one webhook endpoint receive events
 * from both Razorpay accounts; the event is then reconciled to its order via
 * the payment's `providerRef`, which already identifies the account.
 */
export function verifyWebhookSignatureAnyVersion(
  body: string,
  signature: string | null | undefined,
): SiteVersion | null {
  for (const version of ["local", "global"] as SiteVersion[]) {
    if (verifyWebhookSignature(body, signature, version)) return version;
  }
  return null;
}

/**
 * Verify the checkout handler signature (HMAC-SHA256 of
 * `razorpay_order_id|razorpay_payment_id` with the account's key secret). Lets
 * the client-side success path be confirmed server-side before showing "paid" —
 * the webhook remains the authoritative backstop.
 */
export function verifyPaymentSignature(input: {
  version: SiteVersion;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string | null | undefined;
}): boolean {
  if (!input.signature) return false;
  const keySecret = process.env[ENV_KEYS[input.version].secret];
  if (!keySecret) return false;

  const expected = createHmac("sha256", keySecret)
    .update(`${input.razorpayOrderId}|${input.razorpayPaymentId}`)
    .digest("hex");
  return safeEqual(input.signature, expected);
}

export type RazorpayPaymentEvent =
  "payment.captured" | "payment.failed" | "order.paid" | "refund.created";
