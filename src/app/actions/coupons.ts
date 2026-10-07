"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  loadStorefrontCoupons,
  resolveCouponForCart,
} from "@/lib/coupon-store";
import {
  cartSubtotalCents,
  checkCouponEligibility,
  evaluateCoupon,
  isCouponInWindow,
  type CouponCartLine,
  type CouponRecord,
} from "@/lib/coupons";
import { db } from "@/lib/db";
import { priceForVersion } from "@/lib/money";
import {
  SITE_VERSION_COOKIE,
  parseSiteVersion,
  resolveRequestSiteVersion,
  type SiteVersion,
} from "@/lib/site-version";
import { parseInput, safeText } from "@/lib/validation";

/**
 * Storefront coupon reads. These run from client components (the cart page and
 * the quick-buy sheet hold the cart in localStorage, so the server can't see it
 * until asked) and are therefore read-only, public actions: they never change
 * state, and `createOrder` re-validates everything before it is charged.
 */

const itemsInput = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().min(1).max(99),
      }),
    )
    .max(50),
});

const validateInput = itemsInput.extend({
  code: safeText(40, { min: 1, message: "Enter a coupon code." }),
});

const productInput = z.object({ productId: z.string().min(1) });

/** A coupon plus what it would do to the cart it was checked against. */
export type EligibleCoupon = {
  coupon: CouponRecord;
  discountCents: number;
  freeShipping: boolean;
};

export type CouponListResult = {
  coupons: EligibleCoupon[];
  subtotalCents: number;
};

export type CouponValidationResult =
  | { ok: true; coupon: EligibleCoupon; subtotalCents: number }
  | { ok: false; error: string };

type CartContext = {
  version: SiteVersion;
  lines: CouponCartLine[];
  subtotalCents: number;
  userId: string | null;
  email: string | null;
};

/**
 * Resolve the request's store version and price the posted cart lines from the
 * DB — the client only sends ids and quantities, never prices.
 */
async function loadCartContext(
  items: { productId: string; quantity: number }[],
): Promise<CartContext> {
  const requestHeaders = await headers();
  const cookieStore = await cookies();
  const version =
    parseSiteVersion(cookieStore.get(SITE_VERSION_COOKIE)?.value) ??
    resolveRequestSiteVersion(
      requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
    );

  const products = await db.product.findMany({
    where: { id: { in: [...new Set(items.map((i) => i.productId))] } },
    select: {
      id: true,
      priceCents: true,
      globalPriceCents: true,
      brandId: true,
      categoryId: true,
    },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines: CouponCartLine[] = [];
  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product) continue;
    lines.push({
      productId: product.id,
      priceCents: priceForVersion(
        product.priceCents,
        product.globalPriceCents,
        version,
      ),
      qty: item.quantity,
      brandId: product.brandId,
      categoryId: product.categoryId,
    });
  }

  let userId: string | null = null;
  let email: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: requestHeaders });
    userId = session?.user?.id ?? null;
    email = session?.user?.email ?? null;
  } catch {
    userId = null;
  }

  return {
    version,
    lines,
    subtotalCents: cartSubtotalCents(lines),
    userId,
    email,
  };
}

/**
 * How many times a coupon was redeemed overall, and by this shopper. Only used
 * to apply usage limits; a shopper without an account counts zero.
 */
async function loadRedemptionCounts(
  couponIds: string[],
  userId: string | null,
): Promise<Map<string, { total: number; byUser: number }>> {
  const counts = new Map<string, { total: number; byUser: number }>();
  if (couponIds.length === 0) return counts;

  const [totals, byUser] = await Promise.all([
    db.couponRedemption.groupBy({
      by: ["couponId"],
      where: { couponId: { in: couponIds } },
      _count: { _all: true },
    }),
    userId
      ? db.couponRedemption.groupBy({
          by: ["couponId"],
          where: { couponId: { in: couponIds }, userId },
          _count: { _all: true },
        })
      : Promise.resolve([] as { couponId: string; _count: { _all: number } }[]),
  ]);

  for (const id of couponIds) counts.set(id, { total: 0, byUser: 0 });
  for (const row of totals) {
    const entry = counts.get(row.couponId);
    if (entry) entry.total = row._count._all;
  }
  for (const row of byUser) {
    const entry = counts.get(row.couponId);
    if (entry) entry.byUser = row._count._all;
  }
  return counts;
}

/**
 * Whether this shopper counts as a first-time buyer. Signed-in shoppers are
 * checked by email; a guest is treated as new here because the checkout email
 * only exists later — `createOrder` re-checks against the email they enter.
 */
async function loadFirstTimeBuyer(email: string | null): Promise<boolean> {
  if (!email) return true;
  const completed = await db.order.count({
    where: {
      email: email.trim().toLowerCase(),
      status: { in: ["PAID", "PRE_ORDER", "SHIPPED", "DELIVERED"] },
    },
  });
  return completed === 0;
}

/**
 * The coupons worth showing for this cart: active, in-window, for this store,
 * and passing every eligibility rule (minimum order, scope, first purchase,
 * usage limits) against the posted lines.
 */
export async function listEligibleCoupons(
  input: z.infer<typeof itemsInput>,
): Promise<CouponListResult> {
  const data = parseInput(itemsInput, input, "coupons.list");
  const ctx = await loadCartContext(data.items);

  const all = await loadStorefrontCoupons(ctx.version);
  const now = new Date();
  const counts = await loadRedemptionCounts(
    all.map((c) => c.id),
    ctx.userId,
  );
  const firstTimeBuyer = await loadFirstTimeBuyer(ctx.email);

  const coupons: EligibleCoupon[] = [];
  for (const coupon of all) {
    if (!isCouponInWindow(coupon, now)) continue;
    const count = counts.get(coupon.id) ?? { total: 0, byUser: 0 };
    const eligibility = checkCouponEligibility(coupon, ctx.lines, {
      version: ctx.version,
      subtotalCents: ctx.subtotalCents,
      firstTimeBuyer,
      redemptionCount: count.total,
      userRedemptionCount: count.byUser,
    });
    if (!eligibility.ok) continue;
    const evaluation = evaluateCoupon(coupon, ctx.lines);
    coupons.push({
      coupon,
      discountCents: evaluation.discountCents,
      freeShipping: evaluation.freeShipping,
    });
  }

  // Best offer first, so the cart suggests the strongest discount.
  coupons.sort((a, b) => b.discountCents - a.discountCents);

  return { coupons, subtotalCents: ctx.subtotalCents };
}

/** Validate a manually typed code against the cart. */
export async function validateCoupon(
  input: z.infer<typeof validateInput>,
): Promise<CouponValidationResult> {
  const data = parseInput(validateInput, input, "coupons.validate");
  const ctx = await loadCartContext(data.items);

  const result = await resolveCouponForCart({
    code: data.code,
    lines: ctx.lines,
    version: ctx.version,
    email: ctx.email ?? "",
    userId: ctx.userId,
  });
  if (!result.ok) return { ok: false, error: result.reason };
  if (!result.application) {
    return { ok: false, error: "That coupon code doesn't exist." };
  }

  return {
    ok: true,
    subtotalCents: ctx.subtotalCents,
    coupon: {
      coupon: result.application.coupon,
      discountCents: result.application.evaluation.discountCents,
      freeShipping: result.application.evaluation.freeShipping,
    },
  };
}

/**
 * Coupons worth advertising on a product page: those whose scope covers this
 * product (or the whole catalog) and that are live for this store. Shown as a
 * hint — eligibility still depends on the cart, so the discount is not computed
 * here.
 */
export async function listCouponsForProduct(input: {
  productId: string;
}): Promise<CouponRecord[]> {
  const data = parseInput(productInput, input, "coupons.product");

  const requestHeaders = await headers();
  const cookieStore = await cookies();
  const version =
    parseSiteVersion(cookieStore.get(SITE_VERSION_COOKIE)?.value) ??
    resolveRequestSiteVersion(
      requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
    );

  const product = await db.product.findUnique({
    where: { id: data.productId },
    select: { brandId: true, categoryId: true },
  });
  if (!product) return [];

  const all = await loadStorefrontCoupons(version);
  return all.filter((coupon) => {
    switch (coupon.scope) {
      case "ALL":
        return true;
      case "BRAND":
        return coupon.brandId != null && coupon.brandId === product.brandId;
      case "CATEGORY":
        return (
          coupon.categoryId != null && coupon.categoryId === product.categoryId
        );
      case "PRODUCT":
        return coupon.productIds.includes(data.productId);
    }
  });
}
