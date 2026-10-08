"use client";

import { useState, useTransition } from "react";
import { Clock, Eye, EyeOff, Loader2, ShoppingBag } from "lucide-react";
import { notify } from "@/lib/toast";

export type StoreFlagStore = "local" | "global";
export type StoreFlagName = "show" | "preorder" | "buynow";

export interface StoreFlags {
  show: boolean;
  preorder: boolean;
  buynow: boolean;
}

type SetFlag = (
  id: string,
  store: StoreFlagStore,
  flag: StoreFlagName,
  value: boolean,
) => Promise<void>;

/** The three flags, in display order, with the copy the tooltips use. */
const FLAGS: {
  flag: StoreFlagName;
  label: string;
  Icon: typeof Eye;
  offIcon?: typeof Eye;
  on: string;
  off: string;
}[] = [
  {
    flag: "show",
    label: "Shown",
    Icon: Eye,
    offIcon: EyeOff,
    on: "bg-emerald-100 text-emerald-700",
    off: "bg-zinc-100 text-zinc-400",
  },
  {
    flag: "preorder",
    label: "Pre-order",
    Icon: Clock,
    on: "bg-amber-100 text-amber-700",
    off: "bg-zinc-100 text-zinc-300",
  },
  {
    flag: "buynow",
    label: "Buy now",
    Icon: ShoppingBag,
    on: "bg-point-100 text-point-700",
    off: "bg-zinc-100 text-zinc-300",
  },
];

const STORES: { store: StoreFlagStore; short: string; label: string }[] = [
  { store: "local", short: "IN", label: "India" },
  { store: "global", short: "GL", label: "International" },
];

/**
 * The six per-store product flags (show · pre-order · buy-now, for India and
 * the International store) as two compact rows of icon buttons, so the
 * products table shows every flag without a column per flag.
 *
 * Each button is optimistic — it flips on click and reverts if the server
 * action fails — and its tooltip spells out the store, the flag and the state.
 */
export function StoreFlagToggles({
  id,
  name,
  flags,
  onChange,
}: {
  id: string;
  name: string;
  flags: Record<StoreFlagStore, StoreFlags>;
  onChange: SetFlag;
}) {
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState(flags);
  const [busy, setBusy] = useState<string | null>(null);

  // Re-sync from the server whenever it re-renders with fresh data, using the
  // "adjust state during render" pattern (no effect, no cascading renders).
  const [prev, setPrev] = useState(flags);
  if (prev !== flags) {
    setPrev(flags);
    setValues(flags);
  }

  function toggle(store: StoreFlagStore, flag: StoreFlagName) {
    const next = !values[store][flag];
    const key = `${store}:${flag}`;
    setValues((v) => ({ ...v, [store]: { ...v[store], [flag]: next } }));
    setBusy(key);
    startTransition(async () => {
      const label = FLAGS.find((f) => f.flag === flag)?.label ?? flag;
      const storeLabel =
        STORES.find((s) => s.store === store)?.label ?? store;
      const toastId = notify.loading(`${label} · ${storeLabel}…`);
      try {
        await onChange(id, store, flag, next);
        notify.success(
          toastId,
          `${label} ${next ? "on" : "off"} · ${storeLabel}`,
          name,
        );
      } catch (err) {
        setValues((v) => ({ ...v, [store]: { ...v[store], [flag]: !next } }));
        notify.error(
          toastId,
          "Action failed",
          err instanceof Error ? err.message : "Try again.",
        );
      } finally {
        setBusy(null);
      }
    });
  }

  return (
    <div className="inline-flex flex-col gap-1">
      {STORES.map(({ store, short, label }) => (
        <div key={store} className="flex items-center gap-1">
          <span
            className="w-5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400"
            title={label}
          >
            {short}
          </span>
          {FLAGS.map(({ flag, label: flagLabel, Icon, offIcon, on, off }) => {
            const value = values[store][flag];
            const isBusy = busy === `${store}:${flag}` && pending;
            const IconComp = !value && offIcon ? offIcon : Icon;
            return (
              <button
                key={flag}
                type="button"
                onClick={() => toggle(store, flag)}
                aria-pressed={value}
                title={`${flagLabel} · ${label} — ${value ? "on" : "off"}`}
                aria-label={`${flagLabel} on the ${label} store`}
                className={`grid h-[22px] w-[22px] cursor-pointer place-items-center rounded transition-colors hover:brightness-95 ${
                  value ? on : off
                }`}
              >
                {isBusy ? (
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                ) : (
                  <IconComp className="h-3.5 w-3.5" aria-hidden />
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
