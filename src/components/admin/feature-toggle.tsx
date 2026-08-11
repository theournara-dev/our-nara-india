"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { notify } from "@/lib/toast";

type ToggleAction = (id: string, enabled: boolean) => Promise<void>;

/**
 * Small on/off switch used in the admin products table to roll out a feature
 * (Buy Now / popups) per product or per brand.
 *
 * The switch is optimistic: it flips immediately on click instead of waiting
 * for the server component to re-render, so there's no lag between the click
 * and the visual state. While its action is pending it shows a spinner, so you
 * can tell which toggle is being applied even when several are toggled at once.
 * The server action updates the DB; on failure the switch reverts. The local
 * value is re-synced from the `checked` prop whenever the server re-renders
 * with fresh data (e.g. after navigating or filtering).
 */
export function FeatureToggle({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: ToggleAction;
  label: string;
}) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(checked);
  // Re-sync from the server whenever it re-renders with a new value, using the
  // "adjust state during render" pattern (avoids an effect + cascading renders).
  const [prevChecked, setPrevChecked] = useState(checked);
  if (prevChecked !== checked) {
    setPrevChecked(checked);
    setValue(checked);
  }

  function toggle() {
    const next = !value;
    setValue(next); // optimistic — flip immediately
    startTransition(async () => {
      const toastId = notify.loading(next ? "Enabling…" : "Disabling…");
      try {
        await onChange(id, next);
        notify.success(
          toastId,
          next ? `${label} enabled` : `${label} disabled`,
        );
      } catch (err) {
        setValue(!next); // revert on failure
        notify.error(
          toastId,
          "Action failed",
          err instanceof Error ? err.message : "Try again.",
        );
      }
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={toggle}
      disabled={pending}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
        value ? "bg-point-500" : "bg-zinc-200"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          value ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      >
        {pending && (
          <Loader2
            className="h-full w-full animate-spin text-point-500"
            aria-hidden
          />
        )}
      </span>
    </button>
  );
}
