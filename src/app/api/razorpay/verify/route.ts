import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPaymentSignature } from "@/lib/razorpay";

/**
 * Server-side verification of the Razorpay checkout handler result. The
 * client posts the handler response right after the modal succeeds; we check
 * the HMAC (order_id|payment_id signed with the key secret) and only then
 * confirm the payment. The webhook remains the source of truth for order
 * status — this endpoint just makes the immediate UX trustworthy.
 */

export const runtime = "nodejs";

const bodySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export async function POST(request: Request) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const valid = verifyPaymentSignature({
    razorpayOrderId: parsed.razorpay_order_id,
    razorpayPaymentId: parsed.razorpay_payment_id,
    signature: parsed.razorpay_signature,
  });

  if (!valid) {
    return Response.json({ verified: false }, { status: 400 });
  }

  // Record the payment id so refunds can reconcile against it. Merge into
  // any existing payload — if the captured webhook already ran, its full
  // entity must not be clobbered.
  const payment = await db.payment.findFirst({
    where: { provider: "razorpay", providerRef: parsed.razorpay_order_id },
  });
  if (payment) {
    const existingPayload =
      (payment.rawPayload as Record<string, unknown> | null) ?? {};
    if (!existingPayload.razorpay_payment_id) {
      await db.payment.update({
        where: { id: payment.id },
        data: {
          rawPayload: {
            ...existingPayload,
            razorpay_payment_id: parsed.razorpay_payment_id,
          },
        },
      });
    }
  }

  return Response.json({ verified: true });
}