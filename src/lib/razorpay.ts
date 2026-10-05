import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import type { Orders } from "razorpay/dist/types/orders";
import { toAlpha3 } from "@/data/countries";
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

/**
 * Pull a readable reason out of a Razorpay SDK error. The SDK throws a plain
 * object like `{ statusCode, error: { code, description, reason } }` rather
 * than an Error, so `.message` is empty and the detail is lost.
 */
function describeRazorpayError(err: unknown, context: string): string {
  const body = err as
    | { error?: { description?: string; code?: string }; statusCode?: number }
    | undefined;
  const description = body?.error?.description;
  if (description) return `Razorpay ${context} failed: ${description}`;
  if (err instanceof Error && err.message) {
    return `Razorpay ${context} failed: ${err.message}`;
  }
  try {
    return `Razorpay ${context} failed: ${JSON.stringify(err)}`;
  } catch {
    return `Razorpay ${context} failed: unknown error`;
  }
}

export interface CreateOrderInput {
  /** Store version whose account should create the Razorpay order. */
  version: SiteVersion;
  orderId: string;
  amountMinor: number;
  currency?: string;
  /**
   * Customer details collected at checkout. Accounts with customer
   * identification enabled (the global store's live account) reject order
   * creation without a customer name and address, so these are forwarded as
   * Razorpay's `customer_details` when available.
   */
  customer?: {
    name?: string | null;
    contact?: string | null;
    email?: string | null;
    address?: {
      line1?: string | null;
      line2?: string | null;
      city?: string | null;
      state?: string | null;
      postal?: string | null;
      country?: string | null;
    } | null;
  };
}

/**
 * Create a Razorpay "order" for a checkout. `receipt` is your internal order
 * reference and comes back on webhooks so we can reconcile it.
 *
 * Throws `RazorpayError` with Razorpay's own `description` on failure (e.g.
 * "Order Currency is not supported" when an account isn't enabled for the
 * order's currency — a configuration issue, not a transient error).
 */
export async function createRazorpayOrder({
  version,
  orderId,
  amountMinor,
  currency = "INR",
  customer,
}: CreateOrderInput) {
  const name = customer?.name?.trim();
  const contact = customer?.contact?.trim();
  const email = customer?.email?.trim();
  const line1 = customer?.address?.line1?.trim();
  const city = customer?.address?.city?.trim();
  const postal = customer?.address?.postal?.trim();
  const country = customer?.address?.country?.trim();
  // Razorpay demands ISO alpha-3 ("IND", not "IN") — the checkout stores the
  // code the customer entered, so convert at the API edge.
  const country3 = country ? (toAlpha3(country) ?? country) : undefined;
  // Razorpay requires `state` (when present) to be 3–50 characters, but
  // customers routinely type 2-letter codes ("MH", "NY") — omit it rather
  // than fail order creation over an optional field.
  const state = customer?.address?.state?.trim();
  const validState =
    state && state.length >= 3 && state.length <= 50 ? state : undefined;
  try {
    const payload: Orders.RazorpayOrderCreateRequestBody = {
      amount: amountMinor,
      currency,
      receipt: orderId,
      notes: { internalOrderId: orderId },
    };
    // Razorpay accounts with customer identification enabled (the global
    // store's live account) refuse order creation without a customer name
    // and address. Billing mirrors shipping — checkout collects one address.
    if (name) {
      const customerDetails = {
        name,
        contact: contact ?? "",
        email: email ?? "",
      } as Orders.CustomerDetails;
      if (line1 && city && postal && country3) {
        const address = {
          line1,
          line2: customer?.address?.line2?.trim() || undefined,
          zipcode: postal,
          city,
          state: validState,
          country: country3,
        };
        customerDetails.shipping_address = address;
        customerDetails.billing_address = address;
      }
      payload.customer_details = customerDetails;
    }
    return await getRazorpay(version).orders.create(payload);
  } catch (err) {
    throw new RazorpayError(
      describeRazorpayError(err, `${version} order (${currency})`),
      err,
    );
  }
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
