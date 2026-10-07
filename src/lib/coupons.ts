/**
 * Coupon rules, shared by the admin editor, the storefront coupon pages and the
 * checkout total computation in `createOrder`.
 *
 * The same functions run on both sides so the discount the customer sees in the
 * cart is the discount the server charges — the server still recomputes from
 * the DB and remains authoritative.
 */

export type CouponTypeValue = "PERCENT" | "FIXED" | "SHIPPING";
export type CouponScopeValue = "ALL" | "BRAND" | "CATEGORY" | "PRODUCT";

/** Which storefront a coupon belongs to. */
export type CouponSiteVersion = "all" | "local" | "global";

/**
 * The serializable coupon shape used everywhere outside the DB layer. Dates
 * cross the server/client boundary as ISO strings.
 */
export type CouponRecord = {
  id: string;
  code: string;
  type: CouponTypeValue;
  /** Percent (0–100) for PERCENT, minor units for FIXED, ignored for SHIPPING. */
  value: number;
  minOrderCents: number | null;
  maxUses: number | null;
  perUserLimit: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  title: string | null;
  description: string | null;
  scope: CouponScopeValue;
  brandId: string | null;
  categoryId: string | null;
  productIds: string[];
  siteVersion: CouponSiteVersion;
  firstPurchaseOnly: boolean;
  /** Whether the coupon may be used on pre-order items (see the schema note). */
  preOrderAllowed: boolean;
};

/** One cart line, priced for the active store, with the fields scope checks need. */
export type CouponCartLine = {
  productId: string;
  /** Unit price in minor units for the active store. */
  priceCents: number;
  qty: number;
  brandId?: string | null;
  categoryId?: string | null;
  /** Pre-order items can be excluded from a coupon (the default). */
  isPreOrder?: boolean;
};

export type CouponEvaluation = {
  /** Amount off the goods subtotal (0 for a shipping coupon). */
  discountCents: number;
  /** Whether the coupon waives the delivery fee. */
  freeShipping: boolean;
};

export const NO_COUPON: CouponEvaluation = {
  discountCents: 0,
  freeShipping: false,
};

/** The value of a coupon in words, e.g. "10% off", "₹200 off", "Free shipping". */
export function describeCouponValue(
  coupon: Pick<CouponRecord, "type" | "value">,
  formatMoney: (cents: number) => string,
): string {
  switch (coupon.type) {
    case "PERCENT":
      return `${coupon.value}% off`;
    case "FIXED":
      return `${formatMoney(coupon.value)} off`;
    case "SHIPPING":
      return "Free shipping";
  }
}

/** The scope of a coupon in words, e.g. "All products", "Selected products". */
export function describeCouponScope(
  coupon: Pick<CouponRecord, "scope">,
): string {
  switch (coupon.scope) {
    case "ALL":
      return "All products";
    case "BRAND":
      return "Selected brands";
    case "CATEGORY":
      return "Selected categories";
    case "PRODUCT":
      return "Selected products";
  }
}

/** The conditions line shown on coupon cards, e.g. "On orders over ₹999". */
export function couponConditions(
  coupon: Pick<
    CouponRecord,
    "minOrderCents" | "firstPurchaseOnly" | "scope" | "expiresAt"
  >,
  formatMoney: (cents: number) => string,
): string[] {
  const conditions: string[] = [];
  if (coupon.minOrderCents != null && coupon.minOrderCents > 0) {
    conditions.push(`On orders over ${formatMoney(coupon.minOrderCents)}`);
  }
  if (coupon.firstPurchaseOnly) conditions.push("First order only");
  if (coupon.scope !== "ALL") conditions.push(describeCouponScope(coupon));
  if (coupon.expiresAt) {
    conditions.push(`Expires ${formatCouponDate(coupon.expiresAt)}`);
  }
  return conditions;
}

function formatCouponDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Whether the coupon is inside its active window right now. */
export function isCouponInWindow(
  coupon: Pick<CouponRecord, "startsAt" | "expiresAt">,
  now: Date = new Date(),
): boolean {
  if (coupon.startsAt) {
    const start = new Date(coupon.startsAt);
    if (!Number.isNaN(start.getTime()) && now < start) return false;
  }
  if (coupon.expiresAt) {
    const end = new Date(coupon.expiresAt);
    // Expiry is inclusive to the end of the stated moment.
    if (!Number.isNaN(end.getTime()) && now > end) return false;
  }
  return true;
}

/** Whether this store may use the coupon ("all" coupons run on both stores). */
export function isCouponForVersion(
  coupon: Pick<CouponRecord, "siteVersion">,
  version: "local" | "global",
): boolean {
  return coupon.siteVersion === "all" || coupon.siteVersion === version;
}

/** Whether any line in the cart is a pre-order item. */
export function cartHasPreOrder(lines: CouponCartLine[]): boolean {
  return lines.some((line) => line.isPreOrder === true);
}

/** The cart lines a scoped coupon applies to. ALL coupons cover every line. */
export function couponEligibleLines(
  coupon: Pick<CouponRecord, "scope" | "brandId" | "categoryId" | "productIds">,
  lines: CouponCartLine[],
): CouponCartLine[] {
  switch (coupon.scope) {
    case "ALL":
      return lines;
    case "BRAND":
      return coupon.brandId
        ? lines.filter((l) => l.brandId === coupon.brandId)
        : [];
    case "CATEGORY":
      return coupon.categoryId
        ? lines.filter((l) => l.categoryId === coupon.categoryId)
        : [];
    case "PRODUCT": {
      const ids = new Set(coupon.productIds);
      return lines.filter((l) => ids.has(l.productId));
    }
  }
}

export function cartSubtotalCents(lines: CouponCartLine[]): number {
  return lines.reduce((sum, l) => sum + l.priceCents * l.qty, 0);
}

/**
 * The money a coupon takes off this cart, and whether it waives shipping.
 *
 * A scoped coupon discounts only the matching lines; PERCENT rounds to the
 * nearest minor unit (in the customer's favour), and FIXED never exceeds the
 * base it applies to.
 */
export function evaluateCoupon(
  coupon: Pick<
    CouponRecord,
    "type" | "value" | "scope" | "brandId" | "categoryId" | "productIds"
  >,
  lines: CouponCartLine[],
): CouponEvaluation {
  if (coupon.type === "SHIPPING") {
    return { discountCents: 0, freeShipping: true };
  }

  const base = cartSubtotalCents(couponEligibleLines(coupon, lines));
  if (base <= 0) return NO_COUPON;

  if (coupon.type === "PERCENT") {
    const percent = Math.min(100, Math.max(0, coupon.value));
    return {
      discountCents: Math.round((base * percent) / 100),
      freeShipping: false,
    };
  }

  return {
    discountCents: Math.min(Math.max(0, coupon.value), base),
    freeShipping: false,
  };
}

export type CouponEligibilityContext = {
  version: "local" | "global";
  /** Subtotal before any discount. */
  subtotalCents: number;
  /** Whether this shopper has never completed an order. */
  firstTimeBuyer: boolean;
  /** Times this coupon was already redeemed overall. */
  redemptionCount?: number;
  /** Times this shopper already redeemed this coupon. */
  userRedemptionCount?: number;
  now?: Date;
};

export type CouponEligibility = { ok: true } | { ok: false; reason: string };

/**
 * Whether a coupon can be applied to this cart. `reason` is customer-facing
 * copy, so it explains the rule that failed rather than naming internals.
 */
export function checkCouponEligibility(
  coupon: CouponRecord,
  lines: CouponCartLine[],
  ctx: CouponEligibilityContext,
): CouponEligibility {
  if (!coupon.isActive) {
    return { ok: false, reason: "This coupon is no longer available." };
  }
  if (!isCouponForVersion(coupon, ctx.version)) {
    return {
      ok: false,
      reason: "This coupon is not valid on this store.",
    };
  }
  if (!isCouponInWindow(coupon, ctx.now)) {
    return { ok: false, reason: "This coupon has expired." };
  }
  if (coupon.firstPurchaseOnly && !ctx.firstTimeBuyer) {
    return {
      ok: false,
      reason: "This coupon is valid on your first order only.",
    };
  }
  // Pre-orders are excluded unless the coupon opts in: they ship later, and
  // most offers are meant for stock that ships now.
  if (!coupon.preOrderAllowed && cartHasPreOrder(lines)) {
    return {
      ok: false,
      reason:
        "This coupon cannot be used on pre-order items. Remove them from your cart or place the order without the coupon.",
    };
  }
  if (
    coupon.maxUses != null &&
    coupon.maxUses > 0 &&
    (ctx.redemptionCount ?? 0) >= coupon.maxUses
  ) {
    return { ok: false, reason: "This coupon has reached its usage limit." };
  }
  if (
    coupon.perUserLimit != null &&
    coupon.perUserLimit > 0 &&
    (ctx.userRedemptionCount ?? 0) >= coupon.perUserLimit
  ) {
    return {
      ok: false,
      reason: "You have already used this coupon.",
    };
  }
  if (
    coupon.minOrderCents != null &&
    ctx.subtotalCents < coupon.minOrderCents
  ) {
    return {
      ok: false,
      reason: "Your order does not reach this coupon's minimum amount.",
    };
  }
  if (
    coupon.scope !== "ALL" &&
    couponEligibleLines(coupon, lines).length === 0
  ) {
    return {
      ok: false,
      reason: "This coupon does not apply to the items in your cart.",
    };
  }
  return { ok: true };
}

/** Normalize a code typed by a customer: trimmed, upper-cased, no spaces. */
export function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * The coupon code an order was placed with. It lives in the order's `billing`
 * Json because the schema has no dedicated column (the same place the checkout
 * idempotency token is kept).
 */
export function couponCodeFromBilling(billing: unknown): string | null {
  if (billing && typeof billing === "object" && !Array.isArray(billing)) {
    const value = (billing as Record<string, unknown>).couponCode;
    if (typeof value === "string" && value) return value;
  }
  return null;
}
