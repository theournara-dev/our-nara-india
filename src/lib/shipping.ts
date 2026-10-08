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
  /** Hour (0–23) after which an order joins tomorrow's dispatch; default 3 PM. */
  dispatchCutoffHour?: number;
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

/** "3:00 PM" — the daily dispatch cut-off as the shipment notice writes it. */
export function formatCutoffLabel(hour: number): string {
  const clamped = Math.min(23, Math.max(0, Math.round(hour)));
  const twelve = clamped % 12 === 0 ? 12 : clamped % 12;
  return `${twelve}:00 ${clamped < 12 ? "AM" : "PM"}`;
}

const WEEKDAY_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const WEEKDAY_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Weekends are not dispatch days. */
function isDispatchDay(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * The day a parcel ordered now leaves the warehouse, phrased like the client's
 * reference: a cart ordered before today's cut-off makes today's batch and
 * ships on the next dispatch day, one ordered later makes tomorrow's batch.
 *
 * Returns e.g. "Tomorrow 10/07(WED)" or "Monday 10/12(MON)". Callers compute
 * this on the client — it depends on the shopper's clock.
 */
export function nextDispatchLabel(now: Date, cutoffHour: number): string {
  const ship = new Date(now);
  if (now.getHours() >= cutoffHour) ship.setDate(ship.getDate() + 1);
  do {
    ship.setDate(ship.getDate() + 1);
  } while (!isDispatchDay(ship));

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const mm = String(ship.getMonth() + 1).padStart(2, "0");
  const dd = String(ship.getDate()).padStart(2, "0");
  const prefix = isSameDay(ship, tomorrow)
    ? "Tomorrow"
    : WEEKDAY_LONG[ship.getDay()];
  return `${prefix} ${mm}/${dd}(${WEEKDAY_SHORT[ship.getDay()]})`;
}
