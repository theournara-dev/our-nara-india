/**
 * Delivery pricing, shared by the server (checkout totals) and the client
 * (cart / quick-buy sheet / product page progress bar).
 *
 * Each store charges a flat delivery fee and may waive it above a milestone
 * order value — both configured in /admin/site per site version. Keep the
 * arithmetic here so every surface (and the order the customer is charged for)
 * resolves the same number from the same inputs.
 */

export type ShippingSettings = {
  /** Flat delivery fee in minor units; 0 = this store ships free. */
  shippingCents: number;
  /** Order value above which delivery is free; null = no milestone. */
  freeShippingOverCents: number | null;
};

/** A store with no shipping configuration at all: free delivery, no milestone. */
export const FREE_SHIPPING: ShippingSettings = {
  shippingCents: 0,
  freeShippingOverCents: null,
};

/**
 * What this order's delivery costs. The milestone is measured on the amount the
 * customer actually pays for goods (subtotal after any coupon discount), so a
 * coupon can push an order below the free-shipping threshold — the documented,
 * predictable rule.
 */
export function computeShippingCents(
  payableSubtotalCents: number,
  settings: ShippingSettings,
): number {
  if (settings.shippingCents <= 0) return 0;
  const milestone = settings.freeShippingOverCents;
  if (milestone != null && payableSubtotalCents >= milestone) return 0;
  return settings.shippingCents;
}

export type ShippingProgress = {
  /** Whether the store has anything to say (charges a fee or has a milestone). */
  configured: boolean;
  /** True when this order already ships free. */
  isFree: boolean;
  /** Why it is free — the store never charges, or the milestone is met. */
  reason: "none" | "always-free" | "milestone-met";
  /** Amount still needed to unlock free shipping (0 when met or unset). */
  remainingCents: number;
  /** 0–100, clamped, for the progress bar width. */
  percent: number;
  /** The fee charged when the milestone is not met. */
  feeCents: number;
  /** The milestone, when one is set. */
  milestoneCents: number | null;
};

/** Progress towards free shipping for a given goods subtotal. */
export function shippingProgress(
  payableSubtotalCents: number,
  settings: ShippingSettings,
): ShippingProgress {
  const feeCents = Math.max(0, settings.shippingCents);
  const milestoneCents = settings.freeShippingOverCents;
  const charges = feeCents > 0;
  const hasMilestone = milestoneCents != null && milestoneCents > 0;

  if (!charges) {
    return {
      configured: hasMilestone,
      isFree: true,
      reason: "always-free",
      remainingCents: 0,
      percent: 100,
      feeCents,
      milestoneCents,
    };
  }

  if (!hasMilestone) {
    return {
      configured: true,
      isFree: false,
      reason: "none",
      remainingCents: 0,
      percent: 0,
      feeCents,
      milestoneCents: null,
    };
  }

  const met = payableSubtotalCents >= milestoneCents;
  return {
    configured: true,
    isFree: met,
    reason: met ? "milestone-met" : "none",
    remainingCents: met ? 0 : milestoneCents - payableSubtotalCents,
    percent: Math.min(
      100,
      Math.max(0, Math.round((payableSubtotalCents / milestoneCents) * 100)),
    ),
    feeCents,
    milestoneCents,
  };
}
