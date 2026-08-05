import "server-only";
import { createHmac } from "node:crypto";
import Razorpay from "razorpay";

/**
 * Razorpay helpers. This module is server-only (see the `import "server-only"`
 * guard) so API keys never leak into the client bundle.
 *
 * All amounts are integer minor units (paise), which is exactly what Razorpay
 * expects for its `amount` field — so we pass our stored values through as-is.
 */

export class RazorpayError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "RazorpayError";
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new RazorpayError(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Lazily-constructed Razorpay client so env vars are only read when used. */
let client: Razorpay | undefined;

export function getRazorpay(): Razorpay {
  if (client) return client;
  const keyId = requireEnv("RAZORPAY_KEY_ID");
  const keySecret = requireEnv("RAZORPAY_KEY_SECRET");
  client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return client;
}

export interface CreateOrderInput {
  orderId: string;
  amountMinor: number;
  currency?: string;
}

/**
 * Create a Razorpay "order" for a checkout. `receipt` is your internal order
 * reference and comes back on webhooks so we can reconcile it.
 */
export async function createRazorpayOrder({
  orderId,
  amountMinor,
  currency = "INR",
}: CreateOrderInput) {
  const order = await getRazorpay().orders.create({
    amount: amountMinor,
    currency,
    receipt: orderId,
    notes: { internalOrderId: orderId },
  });
  return order;
}

/**
 * Verify a Razorpay webhook signature (HMAC-SHA256 of the raw request body
 * using the webhook secret). Always verify before trusting a webhook payload.
 */
export function verifyWebhookSignature(
  body: string,
  signature: string | null,
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;

  const expected = createHmac("sha256", secret).update(body).digest("hex");
  return signature === expected;
}

export type RazorpayPaymentEvent =
  | "payment.captured"
  | "payment.failed"
  | "order.paid"
  | "refund.created";
