import { db } from "@/lib/db";
import { SITE } from "@/lib/constants";
import { sendEmail } from "@/lib/email";
import { getRazorpay, verifyWebhookSignature } from "@/lib/razorpay";

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
    refund?: { entity?: RazorpayRefundEntity };
  };
}

interface RazorpayRefundEntity {
  id?: string;
  payment_id?: string;
  amount?: number;
  status?: string;
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

  // Idempotency: Razorpay delivers at-least-once. A retried captured event
  // must not re-decrement stock or re-send the confirmation email.
  if (paymentRecord.status === "CAPTURED") return;

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
    // Money WAS captured at a wrong amount — a human must review and refund.
    await notifySupport(
      `[OUR:NARA] Amount mismatch on order ${order.orderNumber} — refund needed`,
      `Razorpay captured a payment for order ${order.orderNumber} that doesn't match our total.\n\nExpected: ${order.totalCents}\nCaptured: ${payment.amount}\n\nThe payment row was marked FAILED for review. Refund via the Razorpay dashboard if this was erroneous.`,
    );
    return;
  }

  await db.$transaction([
    db.payment.update({
      where: { id: paymentRecord.id },
      // Store the Razorpay payment id in a known spot — refund events key on
      // it, since our rows use the Razorpay order id as providerRef.
      data: {
        status: "CAPTURED",
        rawPayload: {
          ...payment,
          razorpay_payment_id: payment.id ?? null,
        } as unknown as object,
      },
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

  // Side-effects: decrement stock and email the customer. Kept outside the
  // transaction — stock is operational and the mail failure must not fail
  // the webhook (Razorpay would otherwise retry a paid event).
  await runPaidSideEffects(order.id, paymentRecord.id);
}

/** A non-fatal issue to flag to support (does not fail the webhook). */
interface FriendlyIssue {
  message: string;
}

/**
 * Paid-order side effects: decrement variant stock + confirmation email.
 * Shared by payment.captured and the order.paid fallback so a missed
 * captured event still reserves stock and mails the customer.
 * The decrement outcome is persisted on the payment row so the refund
 * handler knows whether stock was actually taken (phantom-restock guard).
 */
async function runPaidSideEffects(
  orderId: string,
  paymentRowId: string,
) {
  const orderWithItems = await db.order.findUnique({
    where: { id: orderId },
    select: {
      orderNumber: true,
      items: {
        select: { variantId: true, quantity: true },
      },
    },
  });
  if (!orderWithItems) return;
  const shortage = await decrementStock(orderWithItems.items);
  // Record whether stock was actually taken — refunds restock only when true.
  await db.payment.update({
    where: { id: paymentRowId },
    data: { stockTaken: !shortage },
  });
  if (shortage) {
    console.error(
      `Oversell guard skipped decrement for order ${orderWithItems.orderNumber}: ${shortage.message}`,
    );
    await notifySupport(
      `[OUR:NARA] Oversell guard triggered — order ${orderWithItems.orderNumber}`,
      `The paid order ${orderWithItems.orderNumber} could not decrement stock:\n${shortage.message}\n\nReview the order and product stock manually.`,
    );
  }
  await sendOrderConfirmation(orderWithItems.orderNumber);
}

/**
 * Decrement ProductVariant.stock for the paid items. Uses per-variant
 * `updateMany` with an `stock >= qty` guard so a decrement never drives
 * stock negative. Returns ids the guard skipped — a skip is an oversell
 * symptom (stock changed between order creation and payment), surfaced in
 * the logs and flagged to support.
 */
async function decrementStock(
  items: { variantId: string | null; quantity: number }[],
): Promise<FriendlyIssue | null> {
  // Collect ALL shortages — an early return would leave the remaining paid
  // items un-decremented, creating the next oversell.
  const shortages: string[] = [];
  for (const item of items) {
    if (!item.variantId) continue;
    const res = await db.productVariant.updateMany({
      where: { id: item.variantId, stock: { gte: item.quantity } },
      data: { stock: { decrement: item.quantity } },
    });
    if (res.count === 0) {
      shortages.push(`variant ${item.variantId} (wanted ${item.quantity})`);
    }
  }
  return shortages.length > 0
    ? { message: `Stock shortage on ${shortages.join("; ")}.` }
    : null;
}

/** Best-effort internal alert email; never throws. */
async function notifySupport(subject: string, text: string) {
  try {
    await sendEmail({ to: SITE.supportEmail, subject, text });
  } catch (err) {
    console.error("Support alert email failed:", err);
  }
}

/** Best-effort order confirmation email; never throws. */
async function sendOrderConfirmation(orderNumber: string) {
  try {
    const order = await db.order.findUnique({
      where: { orderNumber },
      select: {
        email: true,
        totalCents: true,
        currency: true,
        items: { select: { name: true, quantity: true } },
      },
    });
    if (!order) return;
    const lines = order.items
      .map((i) => `- ${i.name} x${i.quantity}`)
      .join("\n");
    await sendEmail({
      to: order.email,
      subject: `Order ${orderNumber} confirmed — ${SITE.name}`,
      text: `Thanks for your order!\n\n${lines}\n\nWe'll notify you when it ships.`,
    });
  } catch (err) {
    console.error("Order confirmation email failed:", err);
  }
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
  // Only fails open orders — a retryable FAILED order stays retryable, and
  // paid/protected statuses are never touched.
  if (!order || order.status !== "PENDING") return;

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

  // Fetch the payments for this Razorpay order so we can store the payment
  // id — refund events key on it, and this fallback is exactly the path where
  // the captured webhook (which normally records it) was missed.
  let rzpPaymentId: string | null = null;
  try {
    const rzpPayments = await getRazorpay().orders.fetchPayments(rzpOrderId);
    rzpPaymentId =
      rzpPayments.items?.find((p) => p.status === "captured")?.id ??
      rzpPayments.items?.[0]?.id ??
      null;
  } catch (err) {
    console.error(`Could not fetch payments for razorpay order ${rzpOrderId}:`, err);
  }

  await db.$transaction([
    // This path fires when payment.captured was missed, so also move the
    // payment row off CAPTURED-less limbo and record the payment id for
    // future refund reconciliation.
    db.payment.update({
      where: { id: paymentRecord.id },
      data: {
        status: "CAPTURED",
        ...(rzpPaymentId
          ? {
              rawPayload: {
                razorpay_payment_id: rzpPaymentId,
              },
            }
          : {}),
      },
    }),
    db.order.update({
      where: { id: internalOrder.id },
      data: { status: internalOrder.isPreOrder ? "PRE_ORDER" : "PAID" },
    }),
  ]);

  // The captured event (which normally runs these) was missed — run the
  // same side-effects here.
  await runPaidSideEffects(internalOrder.id, paymentRecord.id);
}

/**
 * Refund processed at Razorpay. Full refunds mark the payment/order REFUNDED
 * and give stock back; partial refunds are NOT auto-applied — the admin
 * applies them from the panel (we note them and alert support).
 */
async function handleRefundCreated(refund: RazorpayRefundEntity) {
  const rzpPaymentId = refund.payment_id;
  if (!rzpPaymentId) return;

  // The refund references Razorpay's payment id; our payment rows key on the
  // Razorpay order id. Captured events store the payment id in rawPayload,
  // so find the payment whose rawPayload names it.
  const paymentRecord = await db.payment.findFirst({
    where: {
      provider: "razorpay",
      rawPayload: { path: ["razorpay_payment_id"], equals: rzpPaymentId },
    },
  });
  if (!paymentRecord) {
    console.error(`No payment row for razorpay payment ${rzpPaymentId} (refund)`);
    await notifySupport(
      `[OUR:NARA] Unmatched refund webhook for payment ${rzpPaymentId}`,
      `A refund arrived for payment ${rzpPaymentId} but no local payment row stores that id (e.g. the order was paid via the order.paid fallback). Reconcile the refund manually.`,
    );
    return;
  }

  // Idempotency: retried refund events must not double-restock.
  if (paymentRecord.status === "REFUNDED") return;

  // Only a FULL refund (>= what we recorded) flips the order and restocks.
  // Stock was only ever decremented via the captured path, so anything that
  // isn't CAPTURED (e.g. an amount-mismatch FAILED payment that was refunded
  // from the dashboard) must NOT restock — it was never decremented.
  const isFullRefund =
    refund.amount != null && refund.amount >= paymentRecord.amountCents;

  const order = await db.order.findUnique({
    where: { id: paymentRecord.orderId },
    select: { id: true, isPreOrder: true },
  });
  if (!order) return;

  if (!isFullRefund) {
    await db.payment.update({
      where: { id: paymentRecord.id },
      // Merge (never replace): keep the razorpay_payment_id key so later
      // refunds still reconcile, and keep the prior payload for audit.
      data: {
        rawPayload: {
          ...((paymentRecord.rawPayload as Record<string, unknown> | null) ?? {}),
          lastPartialRefund: refund,
        } as unknown as object,
      },
    });
    await notifySupport(
      `[OUR:NARA] Partial refund on order — manual reconciliation needed`,
      `A partial refund (${refund.amount ?? "unknown amount"} of ${paymentRecord.amountCents}) arrived for payment ${rzpPaymentId}. The payment/order status was NOT changed — update it manually once fully refunded.`,
    );
    return;
  }

  // Restock ONLY when stock was actually taken. `stockTaken` is written by
  // the captured path (the oversell guard can capture payment without
  // decrementing); for rows written before that flag existed, fall back to
  // the CAPTURED status heuristic.
  const stockWasTaken = paymentRecord.stockTaken || paymentRecord.status === "CAPTURED";

  // Items to give back — resolved BEFORE the transaction so the restock runs
  // inside it (a restock failure then aborts the status flip and the webhook
  // retry is meaningful, instead of a post-transaction failure being eaten by
  // the REFUNDED idempotency guard).
  const items = stockWasTaken
    ? await db.orderItem.findMany({
        where: { orderId: paymentRecord.orderId },
        select: { variantId: true, quantity: true },
      })
    : [];

  await db.$transaction([
    db.payment.update({
      where: { id: paymentRecord.id },
      data: {
        status: "REFUNDED",
        rawPayload: {
          ...refund,
          razorpay_payment_id: rzpPaymentId,
        } as unknown as object,
      },
    }),
    // A refunded pre-order keeps the pre-order flow; only plain orders go
    // straight to REFUNDED here.
    ...(order.isPreOrder
      ? []
      : [
          db.order.update({
            where: { id: order.id },
            data: { status: "REFUNDED" },
          }),
        ]),
    // Give the stock back atomically with the status flip so a restock
    // failure aborts the flip and the webhook retry can make progress.
    ...items.map((item) =>
      db.productVariant.update({
        where: { id: item.variantId! },
        data: { stock: { increment: item.quantity } },
      }),
    ),
  ]);

  await notifySupport(
    `[OUR:NARA] Refund processed for payment ${rzpPaymentId}`,
    `A full refund arrived for payment ${rzpPaymentId}. The payment and order were marked REFUNDED${stockWasTaken ? " and stock was restored" : " (stock untouched — it was never decremented for this payment)"}.`,
  );
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
  const refund = webhook.payload?.refund?.entity ?? {};

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
      case "refund.created":
        await handleRefundCreated(refund);
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
