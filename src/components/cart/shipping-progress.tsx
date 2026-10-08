"use client";

import { useEffect, useState } from "react";
import { Truck } from "lucide-react";
import { formatMoney } from "@/lib/money";
import {
  formatCutoffLabel,
  nextDispatchLabel,
  shippingProgress,
  type ShippingSettings,
} from "@/lib/shipping";

/**
 * Delivery block shared by the cart, the quick-buy sheet and the product page:
 * a dispatch cut-off notice ("Today's shipment closes at 3:00 PM / Order now and
 * it will be shipped Tomorrow 10/07(WED)") over the store's free-delivery
 * progress bar. Always rendered — an empty cart shows the bar at zero progress,
 * a store that ships free shows it filled.
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
  const cutoffHour = settings.dispatchCutoffHour ?? 15;
  const milestoneCents =
    progress.milestoneCents != null && progress.milestoneCents > 0
      ? progress.milestoneCents
      : null;

  // The dispatch date depends on the shopper's clock, so it is computed after
  // mount — the server-rendered HTML must not disagree with the client.
  const [dispatch, setDispatch] = useState<{
    cutoff: string;
    ships: string;
  } | null>(null);
  useEffect(() => {
    const now = new Date();
    // The dispatch date depends on the shopper's clock and timezone; computing
    // it during render would make the server-rendered HTML disagree with the
    // client. This can't move to a lazy initializer for the same reason, and the
    // linter can't model "read the clock on mount".
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDispatch({
      cutoff: formatCutoffLabel(cutoffHour),
      ships: nextDispatchLabel(now, cutoffHour),
    });
  }, [cutoffHour]);

  const savedCents = progress.isFree ? progress.feeCents : 0;
  const reached =
    milestoneCents == null ? progress.feeCents <= 0 : progress.isFree;

  return (
    <div className={className}>
      {/* Dispatch cut-off. Rendered after mount so the server's clock (and
          timezone) can never disagree with the shopper's; the container keeps
          its height so nothing shifts once it appears. */}
      <div className="flex min-h-[72px] items-center gap-3.5 rounded-xl border border-[#f0f0f0] bg-white px-4 py-3.5">
        <span
          aria-hidden
          className="grid size-11 shrink-0 place-items-center rounded-full bg-point-500 text-white"
        >
          <Truck className="h-5 w-5" />
        </span>
        <div className="min-w-0 text-[15px] leading-[22px]">
          {dispatch && (
            <>
              <p className="font-semibold text-[#222]">
                Today&apos;s shipment closes at {dispatch.cutoff}
              </p>
              <p className="text-[#666]">
                Order now and it will be shipped{" "}
                <strong className="font-bold text-point-600">
                  {dispatch.ships}
                </strong>
                .
              </p>
            </>
          )}
        </div>
      </div>

      {/* Free-delivery progress */}
      <div className="mt-2.5 rounded-xl bg-[#f7f7f7] px-4 py-4">
        <div className="flex items-baseline justify-between text-[13px]">
          <span className="text-[#9a9a9a]">{formatMoney(0, currency)}</span>
          <span className="font-semibold text-[#222]">
            {milestoneCents != null
              ? formatMoney(milestoneCents, currency)
              : "FREE"}
          </span>
        </div>
        <div
          className="mt-2 h-3.5 w-full overflow-hidden rounded-full bg-[#e6e6e6]"
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
        <p className="mt-3 text-center text-[15px]">
          {reached ? (
            <>
              <span className="font-bold text-point-600">FREE Shipping</span>
              {savedCents > 0 && (
                <span className="text-[#666]">
                  {" "}
                  (You saved {formatMoney(savedCents, currency)})
                </span>
              )}
            </>
          ) : milestoneCents != null ? (
            <>
              <span className="text-[#666]">Add </span>
              <span className="font-bold text-[#222]">
                {formatMoney(progress.remainingCents, currency)}
              </span>
              <span className="text-[#666]"> more for </span>
              <span className="font-bold text-point-600">FREE Shipping</span>
            </>
          ) : (
            <span className="text-[#666]">
              Delivery fee {formatMoney(progress.feeCents, currency)}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
