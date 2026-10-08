"use client";

import { Truck } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { ShippingSettings } from "@/lib/shipping";

/**
 * The green "free shipping" panel on the product page, as in the client's
 * reference: the store's name for standard delivery, then the milestone the
 * shopper has to reach (or a line saying shipping is always free).
 */
export function FreeShippingBox({
  settings,
  currency = "INR",
  className = "",
}: {
  settings: ShippingSettings;
  currency?: string;
  className?: string;
}) {
  const milestone =
    settings.freeShippingOverCents != null && settings.freeShippingOverCents > 0
      ? settings.freeShippingOverCents
      : null;

  return (
    <div
      className={`rounded-lg border border-[#cdeed3] bg-[#f0faf2] px-4 py-3.5 ${className}`}
    >
      <p className="flex flex-wrap items-center gap-x-2 text-[15px]">
        <Truck className="h-4 w-4 shrink-0 text-[#1a7f37]" aria-hidden />
        <span className="font-bold text-[#1a7f37]">Free Shipping</span>
        <span className="text-[#1a7f37] underline underline-offset-2">
          Standard Only
        </span>
      </p>
      <p className="mt-1 text-[15px] text-[#333]">
        {milestone != null
          ? `No shipping charges on orders above ${formatMoney(milestone, currency)}`
          : "No shipping charges on any order"}
      </p>
    </div>
  );
}
