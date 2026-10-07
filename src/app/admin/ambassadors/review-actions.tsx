"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import { setAmbassadorStatus } from "./actions";
import { type AmbassadorStatusValue } from "./status";

/**
 * Approve / reject / reset controls for one ambassador application. A decision
 * can be changed at any time — the button matching the current state is
 * disabled. The note is prefilled with the stored staff note and replaces it
 * on save (clearing the field removes it).
 */
export function AmbassadorReviewActions({
  id,
  name,
  status,
  note,
}: {
  id: string;
  name: string;
  status: AmbassadorStatusValue;
  note: string | null;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState<AmbassadorStatusValue | null>(null);
  const [draftNote, setDraftNote] = useState("");
  const [pending, startTransition] = useTransition();

  // Close on Escape, matching the other admin dialogs.
  useEffect(() => {
    if (!decision) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) setDecision(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decision, pending]);

  function open(next: AmbassadorStatusValue) {
    setDraftNote(note ?? "");
    setDecision(next);
  }

  function confirm() {
    if (!decision) return;
    const next = decision;
    startTransition(async () => {
      const tid = notify.loading("Saving review…");
      const res = await setAmbassadorStatus(id, next, draftNote.trim() || undefined);
      if (!res.ok) {
        notify.error(tid, "Could not save review", res.message);
        return;
      }
      notify.success(
        tid,
        next === "APPROVED"
          ? "Application approved"
          : next === "REJECTED"
            ? "Application rejected"
            : "Application reset to pending",
      );
      setDecision(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
        <button
          type="button"
          disabled={pending || status === "APPROVED"}
          onClick={() => open("APPROVED")}
          title={status === "APPROVED" ? "Currently approved" : undefined}
          className="inline-flex h-7 items-center rounded-md bg-point-500 px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-point-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "APPROVED" ? "Approved" : "Approve"}
        </button>
        <button
          type="button"
          disabled={pending || status === "REJECTED"}
          onClick={() => open("REJECTED")}
          title={status === "REJECTED" ? "Currently rejected" : undefined}
          className="inline-flex h-7 items-center rounded-md border border-rose-200 bg-white px-2.5 text-[11px] font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "REJECTED" ? "Rejected" : "Reject"}
        </button>
        <button
          type="button"
          disabled={pending || status === "PENDING"}
          onClick={() => open("PENDING")}
          title={status === "PENDING" ? "Already pending" : undefined}
          className="inline-flex h-7 items-center rounded-md border border-zinc-200 bg-white px-2.5 text-[11px] font-medium text-zinc-500 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset
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
            aria-label={
              decision === "APPROVED"
                ? "Approve application"
                : decision === "REJECTED"
                  ? "Reject application"
                  : "Reset application"
            }
            className="relative w-full max-w-lg rounded-2xl bg-white p-6 text-left shadow-2xl"
          >
            <h3 className="text-lg font-semibold text-zinc-900">
              {decision === "APPROVED"
                ? `Approve ${name}'s application?`
                : decision === "REJECTED"
                  ? `Reject ${name}'s application?`
                  : `Reset ${name}'s application to pending?`}
            </h3>
            <p className="mt-2 text-sm text-zinc-500">
              {decision === "APPROVED"
                ? "The application is marked approved so the team can start ambassador onboarding."
                : decision === "REJECTED"
                  ? "The applicant is not emailed automatically — add a note if the team should know why."
                  : "The application returns to the unreviewed queue."}
            </p>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-medium text-zinc-500">
                Note (optional)
              </span>
              <textarea
                value={draftNote}
                onChange={(e) => setDraftNote(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder={
                  decision === "APPROVED"
                    ? "e.g. Strong skincare content — send the welcome kit"
                    : decision === "REJECTED"
                      ? "e.g. Audience outside our markets"
                      : "e.g. Re-review after their follower count is confirmed"
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
                    : decision === "REJECTED"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-zinc-900 hover:bg-zinc-700"
                }`}
              >
                {pending
                  ? "Saving…"
                  : decision === "APPROVED"
                    ? "Approve"
                    : decision === "REJECTED"
                      ? "Reject"
                      : "Reset to pending"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
