"use client";

import { useTransition } from "react";
import { notify } from "@/lib/toast";
import { markPreorderFulfilled } from "./actions";

export function PreorderRowActions({
  id,
  fulfilled,
}: {
  id: string;
  fulfilled: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function onFulfill() {
    startTransition(async () => {
      const toastId = notify.loading("Marking fulfilled…");
      try {
        await markPreorderFulfilled(id);
        notify.success(toastId, "Pre-order fulfilled");
      } catch (err) {
        notify.error(
          toastId,
          "Action failed",
          err instanceof Error ? err.message : "Try again.",
        );
      }
    });
  }

  if (fulfilled) {
    return (
      <span className="text-xs font-medium text-emerald-600">Fulfilled</span>
    );
  }

  return (
    <button
      type="button"
      onClick={onFulfill}
      disabled={pending}
      className="rounded border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
    >
      {pending ? "Marking…" : "Mark fulfilled"}
    </button>
  );
}
