"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Globe, Loader2 } from "lucide-react";
import { useSiteVersion } from "@/components/site-version-provider";
import { notify } from "@/lib/toast";
import {
  SITE_DOMAINS,
  SITE_VERSIONS,
  type SiteVersion,
} from "@/lib/site-version";

const VERSIONS: SiteVersion[] = ["local", "global"];

/**
 * Store switcher (India ↔ International). Shows the active store as a compact
 * chip (globe + label + price hint) and opens a menu that spells out what each
 * store means (currency + shipping). In dev it toggles the runtime version;
 * in production it navigates to the other domain, with a pending state.
 */
export function VersionSwitcher({ className = "" }: { className?: string }) {
  const { version, setVersion } = useSiteVersion();
  const [open, setOpen] = useState(false);
  const [pendingTo, setPendingTo] = useState<SiteVersion | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const isDev = process.env.NODE_ENV !== "production";

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = SITE_VERSIONS[version];

  function choose(next: SiteVersion) {
    setOpen(false);
    if (next === version) return;
    const target = SITE_VERSIONS[next];
    if (isDev) {
      const id = notify.loading(`Switching to ${target.label}…`);
      setVersion(next);
      notify.success(id, `Now browsing ${target.label}`, target.note);
    } else {
      // Cross-domain navigation: mark pending so the chip shows a spinner.
      setPendingTo(next);
      notify.loading(`Switching to ${target.label}…`);
      window.location.assign(SITE_DOMAINS[next]);
    }
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Store: ${current.label}. Change store`}
        title={`Store: ${current.label}`}
        className="flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-zinc-200 bg-zinc-50 pl-2.5 pr-2 text-[12px] font-semibold text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-white"
      >
        {pendingTo ? (
          <Loader2
            className="h-3.5 w-3.5 animate-spin text-point-500"
            aria-hidden
          />
        ) : (
          <Globe className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
        )}
        <span className="text-zinc-900">{current.label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Choose store"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1 shadow-lg"
        >
          {VERSIONS.map((v) => {
            const cfg = SITE_VERSIONS[v];
            const active = v === version;
            return (
              <button
                key={v}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => choose(v)}
                className="flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-zinc-50"
              >
                <span className="mt-0.5 w-4 shrink-0">
                  {active && (
                    <Check className="h-4 w-4 text-point-500" aria-hidden />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-zinc-900">
                      {cfg.label}
                    </span>
                    <span className="text-xs font-medium text-zinc-400">
                      {cfg.priceHint}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    {cfg.note}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
