import { z } from "zod";
import { db } from "@/lib/db";
import { createRazorpayOrder } from "@/lib/razorpay";

/**
 * Creates a Razorpay order for an existing internal Order that is still
 * PENDING. Called by the checkout client once it has built an order.
 *
 * Security notes:
 * - The amount is read from the DB order, never from the client.
 * - The returned Razorpay order id is what the client opens in the Razorpay
 *   checkout modal.
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
  if (order.status !== "PENDING") {
    return Response.json({ error: "Order is not payable" }, { status: 409 });
  }

  try {
    const rzpOrder = await createRazorpayOrder({
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
        status: "CREATED",
      },
    });

    return Response.json({
      keyId: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: rzpOrder.id,
      amountMinor: order.totalCents,
      currency: order.currency,
    });
  } catch (error) {
    console.error("Failed to create Razorpay order:", error);
    return Response.json({ error: "Could not initiate payment" }, { status: 500 });
  }
}
