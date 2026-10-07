"use client";

import { formatMoney } from "@/lib/money";
import { shippingProgress, type ShippingSettings } from "@/lib/shipping";

/**
 * Progress towards the store's free-delivery milestone. Renders nothing unless
 * the store actually charges a fee with a milestone to reach, so a store that
 * ships free never shows a pointless bar.
 */
export function ShippingProgressBar({
  subtotalCents,
  settings,
  currency = "INR",
  className = "",
}: {
  /** Goods subtotal (after any coupon discount) the fee is measured on. */
  subtotalCents: number;
  settings: ShippingSettings;
  currency?: string;
  className?: string;
}) {
  const progress = shippingProgress(subtotalCents, settings);
  if (progress.feeCents <= 0 || progress.milestoneCents == null) return null;

  return (
    <div className={className}>
      <p className="text-xs text-zinc-600">
        {progress.isFree ? (
          <>🎉 You&apos;ve unlocked free delivery!</>
        ) : (
          <>
            Add{" "}
            <span className="font-semibold text-point-600">
              {formatMoney(progress.remainingCents, currency)}
            </span>{" "}
            more for free delivery
          </>
        )}
      </p>
      <div
        className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        aria-label="Progress towards free delivery"
      >
        <div
          className="h-full rounded-full bg-point-500 transition-[width] duration-300"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </div>
  );
}
