"use client";

import { useTransition } from "react";
import { notify } from "@/lib/toast";
import { updateFeedbackStatus } from "./actions";
import {
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_STATUS_STYLES,
  type FeedbackStatusValue,
} from "./status";

const STATUS_STYLES = FEEDBACK_STATUS_STYLES;

/** Status select for one feedback row (inline triage control). */
export function FeedbackStatusSelect({
  id,
  status,
}: {
  id: string;
  status: FeedbackStatusValue;
}) {
  const [pending, startTransition] = useTransition();

  function onChange(next: string) {
    if (next === status) return;
    startTransition(async () => {
      const tid = notify.loading("Updating status…");
      try {
        await updateFeedbackStatus(id, next);
        notify.success(tid, "Status updated");
      } catch (err) {
        notify.error(
          tid,
          "Update failed",
          err instanceof Error ? err.message : "Try again.",
        );
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLES[status]}`}
      >
        {FEEDBACK_STATUS_LABELS[status]}
      </span>
      <select
        value={status}
        onChange={(e) => onChange(e.target.value)}
        disabled={pending}
        aria-label="Feedback status"
        className="h-7 rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
      >
        {Object.entries(FEEDBACK_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}