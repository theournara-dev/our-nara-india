import "server-only";

import { SITE } from "@/lib/constants";
import { couponCodeFromBilling } from "@/lib/coupons";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { issueInvoiceForOrder } from "@/lib/invoices";
import {
  notifyAdminsNewOrder,
  notifyOrderStatusChange,
} from "@/lib/order-notifications";
import { loadSiteConfig } from "@/lib/site-config";
import { versionForOrder } from "@/lib/site-version";

type SideEffectOrder = {
  id: string;
  orderNumber: string;
  isPreOrder: boolean;
  siteVersion?: string | null;
  currency?: string | null;
  items: {
    variantId: string | null;
    productId: string;
    quantity: number;
    product: { name: string; stock: number | null } | null;
  }[];
};

/** Alert the store's own inbox (the address configured for that store). */
async function notifySupport(
  order: SideEffectOrder,
  subject: string,
  message: string,
) {
  try {
    const site = await loadSiteConfig(versionForOrder(order));
    await sendEmail({ to: site.email, subject, text: message });
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

  return shortages.length > 0
    ? `Stock shortage on ${shortages.join("; ")}.`
    : null;
}

/**
 * Record the coupon this order was placed with, so usage limits can be counted
 * on later checkouts. Only signed-in orders can be recorded —
 * `CouponRedemption.userId` is required and a guest checkout has no user to
 * attach; guests' first-purchase eligibility is enforced by email instead.
 */
async function recordCouponRedemption(order: {
  id: string;
  userId: string | null;
  billing: unknown;
}): Promise<void> {
  const code = couponCodeFromBilling(order.billing);
  if (!code || !order.userId) return;

  const coupon = await db.coupon.findFirst({
    where: { code: { equals: code, mode: "insensitive" } },
    select: { id: true },
  });
  if (!coupon) return;

  // The caller claims the order atomically, so a redemption row can only be
  // missing once; the lookup keeps a manual re-run from double-counting.
  const existing = await db.couponRedemption.findFirst({
    where: { orderId: order.id, couponId: coupon.id },
    select: { id: true },
  });
  if (existing) return;

  await db.couponRedemption.create({
    data: { couponId: coupon.id, userId: order.userId, orderId: order.id },
  });
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

  // Issue the invoice right after the claim (the order is confirmed at this
  // point). Best-effort by contract: a billing-document failure must never
  // break the paid path, and the admin can re-issue from the order view.
  try {
    await issueInvoiceForOrder(order.id);
  } catch (error) {
    console.error("[paid-side-effects] invoice issue failed:", error);
  }

  const shortage = await decrementStock(order);

  try {
    await recordCouponRedemption(order);
  } catch (error) {
    console.error("[paid-side-effects] coupon redemption failed:", error);
  }

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
      order,
      `[${SITE.name}] Oversell guard triggered — order ${order.orderNumber}`,
      `The paid order ${order.orderNumber} could not decrement stock (${shortage}).\n\nReview the order and product stock manually.`,
    );
  }

  await notifyOrderStatusChange(order, order.isPreOrder ? "PRE_ORDER" : "PAID");
  await notifyAdminsNewOrder(order);

  return { ran: true };
}
