import "server-only";

import {
  cartSubtotalCents,
  checkCouponEligibility,
  evaluateCoupon,
  isCouponInWindow,
  normalizeCouponCode,
  type CouponCartLine,
  type CouponEvaluation,
  type CouponRecord,
} from "@/lib/coupons";
import { db } from "@/lib/db";
import type { SiteVersion } from "@/lib/site-version";

/**
 * DB access for coupons. Kept out of `coupons.ts` so the rules stay importable
 * from client components while every read/write lives behind `server-only`.
 */

/** Order statuses that count as "already bought" for first-purchase coupons. */
const COMPLETED_ORDER_STATUSES = [
  "PAID",
  "PRE_ORDER",
  "SHIPPED",
  "DELIVERED",
] as const;

type CouponRow = {
  id: string;
  code: string;
  type: string;
  value: number;
  minOrderCents: number | null;
  maxUses: number | null;
  perUserLimit: number | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  title: string | null;
  description: string | null;
  scope: string;
  brandId: string | null;
  categoryId: string | null;
  productIds: string[];
  siteVersion: string;
  firstPurchaseOnly: boolean;
};

/** Map a stored row to the serializable shape the shared rules work on. */
export function couponRowToRecord(row: CouponRow): CouponRecord {
  return {
    id: row.id,
    code: row.code,
    type: row.type as CouponRecord["type"],
    value: row.value,
    minOrderCents: row.minOrderCents,
    maxUses: row.maxUses,
    perUserLimit: row.perUserLimit,
    startsAt: row.startsAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    isActive: row.isActive,
    title: row.title,
    description: row.description,
    scope: row.scope as CouponRecord["scope"],
    brandId: row.brandId,
    categoryId: row.categoryId,
    productIds: row.productIds,
    siteVersion: row.siteVersion as CouponRecord["siteVersion"],
    firstPurchaseOnly: row.firstPurchaseOnly,
  };
}

/**
 * Every coupon a shopper on this store may see, regardless of what is in their
 * cart: active, inside its window, and either shared or belonging to this
 * store. Used by the couponzone page.
 */
export async function loadStorefrontCoupons(
  version: SiteVersion,
): Promise<CouponRecord[]> {
  const rows = await db.coupon.findMany({
    where: { isActive: true, siteVersion: { in: ["all", version] } },
    orderBy: [{ createdAt: "desc" }],
  });
  const now = new Date();
  return rows
    .map(couponRowToRecord)
    .filter((coupon) => isCouponInWindow(coupon, now));
}

/**
 * The coupon with this code, matched case-insensitively (a customer typing
 * "save10" must find a code stored as "SAVE10").
 */
export async function loadCouponByCode(
  code: string,
): Promise<CouponRecord | null> {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return null;
  const row = await db.coupon.findFirst({
    where: { code: { equals: normalized, mode: "insensitive" } },
  });
  return row ? couponRowToRecord(row) : null;
}

export type CouponApplication = {
  coupon: CouponRecord;
  evaluation: CouponEvaluation;
};

export type ResolveCouponResult =
  | { ok: true; application: CouponApplication | null }
  | { ok: false; reason: string };

/**
 * Validate a code against a cart and resolve its effect. `reason` is
 * customer-facing copy. Returns `application: null` when no code was given.
 *
 * The checks mirror what the storefront already showed the customer, but they
 * run again here so a forged request can never buy at a discount it isn't
 * entitled to.
 */
export async function resolveCouponForCart(input: {
  code: string | undefined;
  lines: CouponCartLine[];
  version: SiteVersion;
  /** Checkout email — identifies the shopper for guests without an account. */
  email: string;
  userId: string | null;
}): Promise<ResolveCouponResult> {
  if (!input.code) return { ok: true, application: null };

  const coupon = await loadCouponByCode(input.code);
  if (!coupon) {
    return { ok: false, reason: "That coupon code doesn't exist." };
  }

  const subtotalCents = cartSubtotalCents(input.lines);
  const [redemptionCount, userRedemptionCount, completedOrders] =
    await Promise.all([
      db.couponRedemption.count({ where: { couponId: coupon.id } }),
      input.userId
        ? db.couponRedemption.count({
            where: { couponId: coupon.id, userId: input.userId },
          })
        : Promise.resolve(0),
      coupon.firstPurchaseOnly
        ? db.order.count({
            where: {
              email: input.email.trim().toLowerCase(),
              status: { in: [...COMPLETED_ORDER_STATUSES] },
            },
          })
        : Promise.resolve(0),
    ]);

  const eligibility = checkCouponEligibility(coupon, input.lines, {
    version: input.version,
    subtotalCents,
    firstTimeBuyer: completedOrders === 0,
    redemptionCount,
    userRedemptionCount,
  });
  if (!eligibility.ok) return { ok: false, reason: eligibility.reason };

  return {
    ok: true,
    application: { coupon, evaluation: evaluateCoupon(coupon, input.lines) },
  };
}
