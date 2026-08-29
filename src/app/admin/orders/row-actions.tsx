"use client";

import { useTransition } from "react";
import { notify } from "@/lib/toast";
import { updateOrderStatus } from "./actions";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  type OrderStatusValue,
} from "./status";

export function OrderRowActions({
  id,
  status,
}: {
  id: string;
  status: OrderStatusValue;
}) {
  const [pending, startTransition] = useTransition();

  function onChange(next: string) {
    if (next === status) return;
    startTransition(async () => {
      const toastId = notify.loading("Updating status…");
      try {
        await updateOrderStatus(id, next);
        notify.success(toastId, "Order status updated");
      } catch (err) {
        notify.error(
          toastId,
          "Update failed",
          err instanceof Error ? err.message : "Try again.",
        );
      }
    });
  }

  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value)}
      disabled={pending}
      aria-label="Order status"
      className="rounded border border-zinc-200 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
    >
      {ORDER_STATUSES.map((s) => (
        <option key={s} value={s}>
          {ORDER_STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
