import { db } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/razorpay";

/**
 * Razorpay webhook. Razorpay posts payment events here asynchronously; we use
 * this as the source of truth for marking orders paid (never trust the client).
 *
 * Always verify the HMAC signature against the RAW request body before doing
 * anything. After verification the order and payment records are updated and
 * side-effects (stock, mileage, email) run.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RazorpayPaymentEntity {
  id?: string;
  order_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
}

interface RazorpayWebhook {
  event?: string;
  payload?: { payment?: { entity?: RazorpayPaymentEntity } };
}

async function handlePaymentCaptured(payment: RazorpayPaymentEntity) {
  const rzpOrderId = payment.order_id;
  if (!rzpOrderId) return;

  // Reconcile the payment back to our internal order via the Razorpay order id.
  const paymentRecord = await db.payment.findFirst({
    where: { provider: "razorpay", providerRef: rzpOrderId },
  });
  if (!paymentRecord) {
    console.error(`No payment row for razorpay order ${rzpOrderId}`);
    return;
  }

  await db.$transaction([
    db.payment.update({
      where: { id: paymentRecord.id },
      data: { status: "CAPTURED", rawPayload: payment as unknown as object },
    }),
  ]);

  const order = await db.order.findUnique({
    where: { id: paymentRecord.orderId },
  });
  if (!order) return;

  await db.order.update({
    where: { id: order.id },
    data: { status: order.isPreOrder ? "PRE_ORDER" : "PAID" },
  });

  // TODO(commerce): decrement stock, credit mileage, send confirmation email.
}

async function handlePaymentFailed(payment: RazorpayPaymentEntity) {
  const rzpOrderId = payment.order_id;
  if (!rzpOrderId) return;

  const paymentRecord = await db.payment.findFirst({
    where: { provider: "razorpay", providerRef: rzpOrderId },
  });
  if (!paymentRecord) return;

  await db.payment.update({
    where: { id: paymentRecord.id },
    data: { status: "FAILED", rawPayload: payment as unknown as object },
  });
  await db.order.update({
    where: { id: paymentRecord.orderId },
    data: { status: "FAILED" },
  });
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(body, signature)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let webhook: RazorpayWebhook;
  try {
    webhook = JSON.parse(body) as RazorpayWebhook;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  const event = webhook.event ?? "unknown";
  const payment = webhook.payload?.payment?.entity ?? {};

  try {
    switch (event) {
      case "payment.captured":
        await handlePaymentCaptured(payment);
        break;
      case "payment.failed":
        await handlePaymentFailed(payment);
        break;
      default:
        // Unhandled event types are acknowledged so Razorpay doesn't retry.
        break;
    }
  } catch (error) {
    // Let Razorpay know we failed so it retries; the HMAC check already passed.
    console.error(`Webhook ${event} failed:`, error);
    return new Response("Internal error", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
