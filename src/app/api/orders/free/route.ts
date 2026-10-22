import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { runPaidSideEffects } from "@/lib/paid-side-effects";
import { logOrderStatusChange } from "@/lib/order-status-log";

/**
 * Completes a zero-total order without a payment. The checkout client calls
 * this instead of opening Razorpay when the server-priced total is <= 0
 * (a coupon covered the whole order).
 *
 * Security notes mirror `/api/razorpay/order`: orders attached to a signed-in
 * user are only completable by that user; guest orders stay open (the cuid
 * order id is unguessable). The total is re-read from the DB, never trusted
 * from the client.
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
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const order = await db.order.findUnique({ where: { id: parsed.orderId } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.userId) {
    let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
    try {
      session = await auth.api.getSession({ headers: request.headers });
    } catch {
      session = null;
    }
    if (session?.user?.id !== order.userId) {
      return NextResponse.json(
        { error: "Not authorized for this order" },
        { status: 403 },
      );
    }
  }

  if (order.totalCents > 0) {
    return NextResponse.json(
      { error: "Payment is required for this order." },
      { status: 409 },
    );
  }

  const alreadyDone = order.status === "PAID" || order.status === "PRE_ORDER";
  let flipped = false;
  if (!alreadyDone) {
    if (order.status !== "PENDING" && order.status !== "FAILED") {
      return NextResponse.json(
        { error: "Order is not payable" },
        { status: 409 },
      );
    }

    // Conditional update so a concurrent retry can't regress a completed
    // order; the total is re-checked in the same statement.
    const updated = await db.order.updateMany({
      where: {
        id: order.id,
        status: { in: ["PENDING", "FAILED"] },
        totalCents: { lte: 0 },
      },
      data: { status: order.isPreOrder ? "PRE_ORDER" : "PAID" },
    });

    if (updated.count === 0) {
      const current = await db.order.findUnique({
        where: { id: order.id },
        select: { status: true },
      });
      if (
        !current ||
        (current.status !== "PAID" && current.status !== "PRE_ORDER")
      ) {
        return NextResponse.json(
          { error: "Order is not payable" },
          { status: 409 },
        );
      }
    } else {
      flipped = true;
    }
  }

  // No Payment row: a free order was never charged. The side effects claim is
  // idempotent, so a retried request runs them at most once.
  await runPaidSideEffects(order.id);

  if (flipped) {
    await logOrderStatusChange({
      orderId: order.id,
      orderNumber: order.orderNumber,
      fromStatus: order.status,
      toStatus: order.isPreOrder ? "PRE_ORDER" : "PAID",
      actions: ["invoice", "email_customer", "email_admin"],
    });
  }

  return NextResponse.json({ ok: true, orderNumber: order.orderNumber });
}
