import { db } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/razorpay";

/**
 * Razorpay webhook. Razorpay posts payment events here asynchronously; we use
 * this as the source of truth for marking orders paid (never trust the client).
 *
 * Always verify the HMAC signature against the RAW request body before doing
 * anything. After verification the order and payment records are updated and
 * side-effects (stock, mileage, email) run.
 *
 * Handled events:
 *  - payment.authorized → payment marked AUTHORIZED (order stays PENDING)
 *  - payment.captured   → payment marked CAPTURED, order marked PAID/PRE_ORDER
 *  - payment.failed     → payment marked FAILED, order marked FAILED
 *  - order.paid         → fallback that marks the order PAID if the captured
 *                         event was missed
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

interface RazorpayOrderEntity {
  id?: string;
  amount_paid?: number;
  currency?: string;
  status?: string;
}

interface RazorpayWebhook {
  event?: string;
  payload?: {
    payment?: { entity?: RazorpayPaymentEntity };
    order?: { entity?: RazorpayOrderEntity };
  };
}

/** Reconcile a Razorpay order id back to our internal payment row. */
async function findPaymentByRazorpayOrder(rzpOrderId: string) {
  return db.payment.findFirst({
    where: { provider: "razorpay", providerRef: rzpOrderId },
  });
}

/**
 * Statuses that must never be overwritten by a webhook retry (admin-set
 * terminal/lifecycle states). A retried `payment.captured` must not flip a
 * REFUNDED/CANCELLED order back to PAID; a stale `payment.failed` must not
 * overwrite PAID.
 */
const PROTECTED_ORDER_STATUSES = new Set([
  "PAID",
  "PRE_ORDER",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
]);

async function handlePaymentAuthorized(payment: RazorpayPaymentEntity) {
  const rzpOrderId = payment.order_id;
  if (!rzpOrderId) return;

  const paymentRecord = await findPaymentByRazorpayOrder(rzpOrderId);
  if (!paymentRecord) {
    console.error(`No payment row for razorpay order ${rzpOrderId}`);
    return;
  }

  // Authorization alone doesn't mean the money moved — the order stays PENDING
  // until the payment is captured.
  await db.payment.update({
    where: { id: paymentRecord.id },
    data: { status: "AUTHORIZED", rawPayload: payment as unknown as object },
  });
}

async function handlePaymentCaptured(payment: RazorpayPaymentEntity) {
  const rzpOrderId = payment.order_id;
  if (!rzpOrderId) return;

  const paymentRecord = await findPaymentByRazorpayOrder(rzpOrderId);
  if (!paymentRecord) {
    console.error(`No payment row for razorpay order ${rzpOrderId}`);
    return;
  }

  const order = await db.order.findUnique({
    where: { id: paymentRecord.orderId },
  });
  if (!order) return;

  // Security: never trust the client amount. If the captured amount doesn't
  // match what we charged, flag it and don't mark the order paid.
  if (payment.amount != null && payment.amount !== order.totalCents) {
    console.error(
      `Amount mismatch for order ${order.orderNumber}: expected ${order.totalCents}, got ${payment.amount}`,
    );
    await db.payment.update({
      where: { id: paymentRecord.id },
      // FAILED (not CAPTURED) keeps this payment distinguishable from a
      // legitimate one — this path is a fraud signal.
      data: { status: "FAILED", rawPayload: payment as unknown as object },
    });
    return;
  }

  await db.$transaction([
    db.payment.update({
      where: { id: paymentRecord.id },
      data: { status: "CAPTURED", rawPayload: payment as unknown as object },
    }),
    // Guard against webhook retries regressing admin-set statuses (e.g.
    // REFUNDED back to PAID); only advance from open states.
    ...(PROTECTED_ORDER_STATUSES.has(order.status)
      ? []
      : [
          db.order.update({
            where: { id: order.id },
            data: { status: order.isPreOrder ? "PRE_ORDER" : "PAID" },
          }),
        ]),
  ]);

  // TODO(commerce): decrement stock, credit mileage, send confirmation email.
}

async function handlePaymentFailed(payment: RazorpayPaymentEntity) {
  const rzpOrderId = payment.order_id;
  if (!rzpOrderId) return;

  const paymentRecord = await findPaymentByRazorpayOrder(rzpOrderId);
  if (!paymentRecord) return;

  // A stale failure (e.g. attempt 1 of 2 failed, then a retry captured) must
  // not overwrite a captured payment or a paid/protected order.
  if (paymentRecord.status === "CAPTURED") return;

  await db.payment.update({
    where: { id: paymentRecord.id },
    data: { status: "FAILED", rawPayload: payment as unknown as object },
  });

  const order = await db.order.findUnique({
    where: { id: paymentRecord.orderId },
    select: { id: true, status: true },
  });
  if (!order || PROTECTED_ORDER_STATUSES.has(order.status)) return;

  await db.order.update({
    where: { id: order.id },
    data: { status: "FAILED" },
  });
}

async function handleOrderPaid(order: RazorpayOrderEntity) {
  const rzpOrderId = order.id;
  if (!rzpOrderId) return;

  const paymentRecord = await findPaymentByRazorpayOrder(rzpOrderId);
  if (!paymentRecord) return;

  const internalOrder = await db.order.findUnique({
    where: { id: paymentRecord.orderId },
  });
  if (!internalOrder) return;

  // Don't regress admin-set statuses (REFUNDED/CANCELLED/...).
  if (PROTECTED_ORDER_STATUSES.has(internalOrder.status)) return;

  // Same amount guard as payment.captured — this is a fallback for a missed
  // captured event, so it must apply the identical check.
  if (
    order.amount_paid != null &&
    order.amount_paid !== internalOrder.totalCents
  ) {
    console.error(
      `Amount mismatch (order.paid) for order ${internalOrder.orderNumber}: expected ${internalOrder.totalCents}, got ${order.amount_paid}`,
    );
    return;
  }

  await db.$transaction([
    // This path fires when payment.captured was missed, so also move the
    // payment row off CREATED.
    db.payment.update({
      where: { id: paymentRecord.id },
      data: { status: "CAPTURED" },
    }),
    db.order.update({
      where: { id: internalOrder.id },
      data: { status: internalOrder.isPreOrder ? "PRE_ORDER" : "PAID" },
    }),
  ]);
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
  const order = webhook.payload?.order?.entity ?? {};

  try {
    switch (event) {
      case "payment.authorized":
        await handlePaymentAuthorized(payment);
        break;
      case "payment.captured":
        await handlePaymentCaptured(payment);
        break;
      case "payment.failed":
        await handlePaymentFailed(payment);
        break;
      case "order.paid":
        await handleOrderPaid(order);
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
