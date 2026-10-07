"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  listEligibleCoupons,
  validateCoupon,
  type EligibleCoupon,
} from "@/app/actions/coupons";
import { useCart } from "@/lib/cart";
import {
  couponConditions,
  describeCouponValue,
  normalizeCouponCode,
} from "@/lib/coupons";
import { formatMoney } from "@/lib/money";
import { notify } from "@/lib/toast";

/** The coupon currently applied to the checkout, with its effect on the cart. */
export type AppliedCoupon = {
  code: string;
  discountCents: number;
  freeShipping: boolean;
  title: string | null;
};

/**
 * Coupon panel for the cart and the quick-buy sheet: a code box plus the
 * coupons that already qualify for this cart (first-purchase codes, minimum
 * order offers, product/brand/category deals) with their real discount.
 *
 * The cart lives in localStorage, so the server can't price the offers until
 * asked — eligibility is fetched per cart contents. `createOrder` re-validates
 * the applied code, so this panel is convenience, not the source of truth.
 */
export function CouponBox({
  applied,
  onApplied,
  currency = "INR",
  className = "",
}: {
  applied: AppliedCoupon | null;
  onApplied: (applied: AppliedCoupon | null) => void;
  currency?: string;
  className?: string;
}) {
  const cart = useCart();
  const items = useMemo(
    () =>
      cart.map((item) => ({
        productId: item.productId,
        quantity: item.qty,
      })),
    [cart],
  );
  // Stable identity for "what is in the cart", so the fetch below runs when the
  // contents change rather than on every render.
  const signature = useMemo(
    () => items.map((i) => `${i.productId}:${i.quantity}`).join("|"),
    [items],
  );

  const [eligible, setEligible] = useState<EligibleCoupon[]>([]);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  // The latest applied coupon/callback without making them effect dependencies
  // (they change identity on every parent render).
  const appliedRef = useRef(applied);
  const onAppliedRef = useRef(onApplied);
  useEffect(() => {
    appliedRef.current = applied;
    onAppliedRef.current = onApplied;
  });

  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const result = await listEligibleCoupons({ items });
        if (cancelled) return;
        setEligible(result.coupons);

        // Re-price (or drop) the applied coupon against the new cart: removing
        // the qualifying item must not leave a discount on screen.
        const current = appliedRef.current;
        if (!current) return;
        const match = result.coupons.find(
          (c) => c.coupon.code === current.code,
        );
        if (match) {
          onAppliedRef.current(toApplied(match));
        } else {
          onAppliedRef.current(null);
          notify.error(
            "coupon-removed",
            "Coupon removed",
            "Your cart no longer qualifies for that coupon.",
          );
        }
      } catch (error) {
        console.error("[coupons] failed to load eligible coupons:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [items, signature]);

  async function apply(rawCode: string) {
    const normalized = normalizeCouponCode(rawCode);
    if (!normalized) return;
    setBusy(true);
    try {
      const result = await validateCoupon({ items, code: normalized });
      if (!result.ok) {
        notify.error("coupon-invalid", "Coupon not applied", result.error);
        return;
      }
      onApplied(toApplied(result.coupon));
      setCode("");
      notify.success(
        "coupon-applied",
        "Coupon applied",
        result.coupon.freeShipping
          ? `${result.coupon.coupon.code} — free delivery`
          : `${result.coupon.coupon.code} — ${formatMoney(result.coupon.discountCents, currency)} off`,
      );
    } catch (error) {
      console.error("[coupons] failed to validate coupon:", error);
      notify.error(
        "coupon-error",
        "Coupon not applied",
        "Please try again in a moment.",
      );
    } finally {
      setBusy(false);
    }
  }

  const money = (cents: number) => formatMoney(cents, currency);

  return (
    <section
      className={`rounded-2xl border border-zinc-100 bg-white p-5 ${className}`}
    >
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Coupons
      </h2>

      {applied ? (
        <div className="flex items-center justify-between gap-3 rounded border border-point-200 bg-point-50 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate font-mono text-sm font-semibold text-point-700">
              {applied.code}
            </p>
            <p className="text-xs text-point-600">
              {applied.freeShipping
                ? "Free delivery applied"
                : `${money(applied.discountCents)} off`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onApplied(null)}
            className="shrink-0 text-xs text-point-600 underline hover:text-point-700"
          >
            Remove
          </button>
        </div>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void apply(code);
          }}
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Coupon code"
            className="h-9 min-w-0 flex-1 rounded border border-zinc-200 bg-white px-2 font-mono text-sm uppercase text-zinc-900 outline-none focus:border-point-500"
          />
          <button
            type="submit"
            disabled={busy || code.trim() === ""}
            className="h-9 shrink-0 rounded border border-point-500 px-4 text-sm font-semibold text-point-600 transition-colors hover:bg-point-50 disabled:opacity-50"
          >
            {busy ? "Checking…" : "Apply"}
          </button>
        </form>
      )}

      {eligible.length > 0 && (
        <ul className="mt-4 space-y-2">
          {eligible.map((entry) => {
            const isApplied = applied?.code === entry.coupon.code;
            return (
              <li
                key={entry.coupon.id}
                className="rounded border border-dashed border-zinc-200 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900">
                      {entry.coupon.title ??
                        describeCouponValue(entry.coupon, money)}
                    </p>
                    {entry.coupon.description && (
                      <p className="text-xs text-zinc-500">
                        {entry.coupon.description}
                      </p>
                    )}
                    {couponConditions(entry.coupon, money).length > 0 && (
                      <p className="mt-1 text-[11px] text-zinc-400">
                        {couponConditions(entry.coupon, money).join(" · ")}
                      </p>
                    )}
                    <p className="mt-1 font-mono text-xs text-point-600">
                      {entry.coupon.code}
                      {entry.freeShipping
                        ? " · free delivery"
                        : entry.discountCents > 0
                          ? ` · ${money(entry.discountCents)} off`
                          : ""}
                    </p>
                  </div>
                  {!isApplied && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void apply(entry.coupon.code)}
                      className="shrink-0 rounded border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
                    >
                      Apply
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function toApplied(entry: EligibleCoupon): AppliedCoupon {
  return {
    code: entry.coupon.code,
    discountCents: entry.discountCents,
    freeShipping: entry.freeShipping,
    title: entry.coupon.title,
  };
}
