import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createRazorpayOrder, razorpayAccountFor } from "@/lib/razorpay";
import { versionForOrder } from "@/lib/site-version";

/**
 * Creates a Razorpay order for an existing internal Order that is still
 * PENDING. Called by the checkout client once it has built an order.
 *
 * Security notes:
 * - The amount is read from the DB order, never from the client.
 * - The returned Razorpay order id is what the client opens in the Razorpay
 *   checkout modal.
 * - Orders attached to a signed-in user are only payable by that user. Guest
 *   orders stay open (the cuid order id is unguessable).
 */

export const runtime = "nodejs";

const bodySchema = z.object({
  orderId: z.string().min(1),
});

export async function POST(request: Request) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const order = await db.order.findUnique({ where: { id: parsed.orderId } });
  if (!order) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }

  // Ownership check: an order placed while signed in belongs to that user.
  // Guests (userId null) stay open — their order id is an unguessable cuid.
  if (order.userId) {
    let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
    try {
      session = await auth.api.getSession({ headers: request.headers });
    } catch {
      session = null;
    }
    if (session?.user?.id !== order.userId) {
      return Response.json(
        { error: "Not authorized for this order" },
        { status: 403 },
      );
    }
  }

  // FAILED orders are retryable: a failed attempt (bank timeout, dropped
  // network) must not brick the cart — a fresh Razorpay order revives it.
  if (order.status !== "PENDING" && order.status !== "FAILED") {
    return Response.json({ error: "Order is not payable" }, { status: 409 });
  }

  // Revive a failed order back to PENDING so the payment flow can proceed.
  if (order.status === "FAILED") {
    await db.order.update({
      where: { id: order.id },
      data: { status: "PENDING" },
    });
  }

  try {
    // Route to the Razorpay account that owns this order (local vs global),
    // derived from the order — never the request — so retries and webhooks
    // always hit the same account.
    const version = versionForOrder(order);
    const rzpOrder = await createRazorpayOrder({
      version,
      orderId: order.id,
      amountMinor: order.totalCents,
      currency: order.currency,
    });

    // Persist the payment so the webhook can reconcile it to this order.
    await db.payment.create({
      data: {
        orderId: order.id,
        provider: "razorpay",
        providerRef: rzpOrder.id,
        amountCents: order.totalCents,
        currency: order.currency,
        siteVersion: version,
        status: "CREATED",
      },
    });

    return Response.json({
      keyId: razorpayAccountFor(version).keyId,
      razorpayOrderId: rzpOrder.id,
      amountMinor: order.totalCents,
      currency: order.currency,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(
      `Failed to create Razorpay order for ${order.orderNumber}:`,
      detail,
      error,
    );
    // A misconfigured account (e.g. a currency the account isn't enabled for)
    // is not transient — surface a specific message the storefront can explain
    // instead of a generic "gateway" error.
    const currencyIssue = /currency is not supported/i.test(detail);
    return Response.json(
      {
        error: currencyIssue
          ? "Payment is not available for this store yet."
          : "Could not initiate payment",
      },
      { status: currencyIssue ? 503 : 500 },
    );
  }
}
