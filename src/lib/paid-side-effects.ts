import "server-only";

import { SITE } from "@/lib/constants";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import {
  notifyAdminsNewOrder,
  notifyOrderStatusChange,
} from "@/lib/order-notifications";

type SideEffectOrder = {
  id: string;
  orderNumber: string;
  isPreOrder: boolean;
  items: {
    variantId: string | null;
    productId: string;
    quantity: number;
    product: { name: string; stock: number | null } | null;
  }[];
};

async function notifySupport(subject: string, message: string) {
  try {
    await sendEmail({ to: SITE.supportEmail, subject, text: message });
  } catch (error) {
    console.error("[paid-side-effects] support notification failed:", error);
  }
}

/**
 * Decrement stock for a paid order: per-variant when a variant is attached,
 * per-product for variantless items when the product tracks stock (a null
 * product stock means untracked/unlimited). Collects every shortage instead
 * of stopping at the first so the support alert lists them all.
 */
async function decrementStock(order: SideEffectOrder): Promise<string | null> {
  const shortages: string[] = [];

  for (const item of order.items) {
    if (item.variantId) {
      const result = await db.productVariant.updateMany({
        where: { id: item.variantId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (result.count === 0) {
        shortages.push(`variant ${item.variantId} (wanted ${item.quantity})`);
      }
      continue;
    }

    if (item.product?.stock == null) continue;

    const result = await db.product.updateMany({
      where: { id: item.productId, stock: { gte: item.quantity } },
      data: { stock: { decrement: item.quantity } },
    });
    if (result.count === 0) {
      shortages.push(`${item.product.name} (wanted ${item.quantity})`);
    }
  }

  return shortages.length > 0 ? `Stock shortage on ${shortages.join("; ")}.` : null;
}

/**
 * Run every paid-order side effect exactly once per order: stock decrement,
 * customer confirmation email, admin alert.
 *
 * `paidSideEffectsAt` is claimed with a single conditional UPDATE, so
 * concurrent senders (payment.captured, order.paid, cron reconciliation) can
 * never double-decrement stock or double-send emails. Returns `{ ran: false }`
 * when another caller already claimed the order.
 */
export async function runPaidSideEffects(
  orderId: string,
  paymentRowId?: string,
): Promise<{ ran: boolean }> {
  const claim = await db.order.updateMany({
    where: { id: orderId, paidSideEffectsAt: null },
    data: { paidSideEffectsAt: new Date() },
  });
  if (claim.count === 0) return { ran: false };

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: { product: { select: { name: true, stock: true } } },
      },
    },
  });
  if (!order) return { ran: true };

  const shortage = await decrementStock(order);

  if (paymentRowId) {
    try {
      await db.payment.update({
        where: { id: paymentRowId },
        data: { stockTaken: !shortage },
      });
    } catch (error) {
      console.error("[paid-side-effects] failed to flag stockTaken:", error);
    }
  }

  if (shortage) {
    console.error(
      `[paid-side-effects] oversell guard skipped decrement for order ${order.orderNumber}: ${shortage}`,
    );
    await notifySupport(
      `[${SITE.name}] Oversell guard triggered — order ${order.orderNumber}`,
      `The paid order ${order.orderNumber} could not decrement stock (${shortage}).\n\nReview the order and product stock manually.`,
    );
  }

  await notifyOrderStatusChange(order, order.isPreOrder ? "PRE_ORDER" : "PAID");
  await notifyAdminsNewOrder(order);

  return { ran: true };
}
