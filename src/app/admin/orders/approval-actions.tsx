"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import { reviewOrderApproval } from "./actions";

type Decision = "APPROVED" | "REJECTED";

/**
 * Approve / reject controls for a global order's uploaded ID. A decision can be
 * changed at any time — the button matching the current state is disabled and
 * every change is appended to the order's approval history.
 */
export function ApprovalActions({
  orderId,
  orderNumber,
  current = "PENDING",
}: {
  orderId: string;
  orderNumber: string;
  current?: string;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const changing = current === "APPROVED" || current === "REJECTED";

  // Close on Escape, matching the other dialogs.
  useEffect(() => {
    if (!decision) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) setDecision(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decision, pending]);

  function open(next: Decision) {
    setNote("");
    setDecision(next);
  }

  function confirm() {
    if (!decision) return;
    const next = decision;
    startTransition(async () => {
      const tid = notify.loading("Saving review…");
      const res = await reviewOrderApproval(orderId, {
        decision: next,
        note: note.trim() || undefined,
      });
      if (!res.ok) {
        notify.error(tid, "Could not save review", res.message);
        return;
      }
      notify.success(tid, next === "APPROVED" ? "ID approved" : "ID rejected");
      setDecision(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={pending || current === "APPROVED"}
          onClick={() => open("APPROVED")}
          title={current === "APPROVED" ? "Currently approved" : undefined}
          className="inline-flex h-7 items-center rounded-md bg-point-500 px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-point-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {current === "APPROVED" ? "Approved" : "Approve"}
        </button>
        <button
          type="button"
          disabled={pending || current === "REJECTED"}
          onClick={() => open("REJECTED")}
          title={current === "REJECTED" ? "Currently rejected" : undefined}
          className="inline-flex h-7 items-center rounded-md border border-rose-200 bg-white px-2.5 text-[11px] font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {current === "REJECTED" ? "Rejected" : "Reject"}
        </button>
      </div>

      {decision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm"
            onClick={pending ? undefined : () => setDecision(null)}
            aria-hidden
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label={decision === "APPROVED" ? "Approve ID" : "Reject ID"}
            className="relative w-full max-w-lg rounded-2xl bg-white p-6 text-left shadow-2xl"
          >
            <h3 className="text-lg font-semibold text-zinc-900">
              {changing
                ? decision === "APPROVED"
                  ? `Change the decision for ${orderNumber} to approved?`
                  : `Change the decision for ${orderNumber} to rejected?`
                : decision === "APPROVED"
                  ? `Approve the ID for ${orderNumber}?`
                  : `Reject the ID for ${orderNumber}?`}
            </h3>
            <p className="mt-2 text-sm text-zinc-500">
              {decision === "APPROVED"
                ? "The document is verified; the order can proceed to fulfilment."
                : "The order stays on hold until it is approved. The note below is kept for staff — the customer is not emailed."}
              {changing && (
                <> The previous decision stays in the history below.</>
              )}
            </p>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-medium text-zinc-500">
                Note (optional)
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder={
                  decision === "APPROVED"
                    ? "e.g. Passport photo matches the shipping name"
                    : "e.g. ID photo is unreadable — request a new one"
                }
                className="w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-point-500"
              />
            </label>
            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDecision(null)}
                disabled={pending}
                className="h-9 rounded border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={pending}
                className={`h-9 flex-1 rounded px-4 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
                  decision === "APPROVED"
                    ? "bg-point-500 hover:bg-point-600"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {pending
                  ? "Saving…"
                  : decision === "APPROVED"
                    ? "Approve"
                    : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
