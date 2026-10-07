"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  couponConditions,
  describeCouponScope,
  describeCouponValue,
  type CouponRecord,
} from "@/lib/coupons";
import { formatMoney } from "@/lib/money";
import { notify } from "@/lib/toast";

/**
 * One coupon on the couponzone page: what it is worth, the conditions, and the
 * code with a copy button — codes are applied in the cart, so copying is the
 * only action here.
 */
export function CouponCard({ coupon }: { coupon: CouponRecord }) {
  const [copied, setCopied] = useState(false);
  const money = (cents: number) =>
    formatMoney(cents, "INR", { convert: false });
  const conditions = couponConditions(coupon, money);

  async function copy() {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      notify.success("coupon-copied", "Code copied", "Paste it in your cart.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      notify.error(
        "coupon-copy-failed",
        "Could not copy",
        `Please type the code: ${coupon.code}`,
      );
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-100 bg-white p-6">
      <Badge tone="accent" className="self-start">
        {describeCouponValue(coupon, money)}
      </Badge>
      <h2 className="mt-3 text-lg font-semibold text-zinc-900">
        {coupon.title ?? describeCouponScope(coupon)}
      </h2>
      {coupon.description ? (
        <p className="mt-1 flex-1 text-sm text-zinc-500">
          {coupon.description}
        </p>
      ) : (
        <div className="flex-1" />
      )}
      {conditions.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-zinc-400">
          {conditions.map((condition) => (
            <li key={condition}>{condition}</li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex items-center gap-2">
        <code className="rounded border border-dashed border-zinc-300 bg-zinc-50 px-2 py-1 font-mono text-xs text-zinc-700">
          {coupon.code}
        </code>
        <Button size="sm" variant="outline" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy code"}
        </Button>
      </div>
    </div>
  );
}
