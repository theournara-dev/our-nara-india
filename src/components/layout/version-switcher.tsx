"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, Loader2 } from "lucide-react";
import { useSiteVersion } from "@/components/site-version-provider";
import { StoreNudge } from "@/components/layout/store-nudge";
import {
  StorePickerCards,
  STORE_PICKER_PANEL_CLASS,
} from "@/components/layout/store-picker-cards";
import { notify } from "@/lib/toast";
import { SITE_DOMAINS, type SiteVersion } from "@/lib/site-version";
import type { SwitcherContent } from "@/lib/site-content";

/**
 * Store control, in two parts (client's last round):
 *
 * 1. **The toggle** — two connected halves. The active half wears its store's
 *    top-banner background (the International gradient or the India purple); the
 *    other is greyed out. It is deliberately small: it sits beside the icons as
 *    a quick switch, not as a banner.
 * 2. **The popup button** — the chip that names the current store and opens the
 *    panel of store cards (content is admin-editable per store in /admin/site).
 *    Kept as it was: the descriptions, badges and "Don't show again" hint live
 *    there.
 *
 * Pressing a toggle half switches the store (runtime version in development,
 * the other domain in production).
 */
export function VersionSwitcher({
  content,
  backgrounds,
  className = "",
}: {
  content: SwitcherContent;
  /** Each store's top-banner background, as CSS (a colour or a gradient). */
  backgrounds: Record<SiteVersion, string>;
  className?: string;
}) {
  const { version, setVersion } = useSiteVersion();
  const [open, setOpen] = useState(false);
  const [pendingTo, setPendingTo] = useState<SiteVersion | null>(null);
  // On phones the panel is pinned to the viewport edge instead of the chip's
  // right edge (the chip sits at the right of the header, so a right-aligned
  // panel would run off the left side of the screen).
  const [panelLeft, setPanelLeft] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const isDev = process.env.NODE_ENV !== "production";

  // Close on outside click / Escape, like any other menu.
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

  const activeBlock = content.blocks.find((b) => b.store === version);
  // The toggle's right-hand side is the India store, so its label is that
  // store's name — fixed, it names a side of the toggle, not the current store.
  const localTitle =
    content.blocks.find((b) => b.store === "local")?.title ?? "India";

  const options: { store: SiteVersion; label: string; background: string }[] = [
    { store: "global", label: "KDROP", background: backgrounds.global },
    { store: "local", label: localTitle, background: backgrounds.local },
  ];

  function choose(next: SiteVersion) {
    setOpen(false);
    if (next === version) return;
    const target = content.blocks.find((b) => b.store === next);
    if (isDev) {
      const id = notify.loading(`Switching to ${target?.title ?? next}…`);
      setVersion(next);
      notify.success(
        id,
        `Now browsing ${target?.title ?? next}`,
        target?.description,
      );
    } else {
      // Cross-domain navigation: mark pending so the half shows a spinner.
      setPendingTo(next);
      notify.loading(`Switching to ${target?.title ?? next}…`);
      window.location.assign(SITE_DOMAINS[next]);
    }
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div className="flex items-center gap-1.5">
        {/* 1. The quick switch: one pill, not two. The container is the pill
            (grey, clipped); the **active** half is the only rounded, coloured
            shape and it laps over the grey half, so the unselected side has no
            visible corner of its own — the control reads as a single component
            with a coloured slider on it (client's note). */}
        <div
          role="group"
          aria-label="Choose your store"
          className="flex shrink-0 items-center overflow-hidden rounded-full bg-zinc-200"
        >
          {options.map(({ store, label, background }, index) => {
            const active = version === store;
            const pending = pendingTo === store;
            return (
              <button
                key={store}
                type="button"
                onClick={() => choose(store)}
                aria-pressed={active}
                aria-label={
                  store === "global"
                    ? "Shop the International (K-Drop) store"
                    : `Shop the ${label} store`
                }
                title={
                  store === "global"
                    ? "International store — K-Drop"
                    : `${label} store`
                }
                className={`relative flex h-8 items-center justify-center gap-1 px-5 text-[11.5px] font-bold uppercase tracking-[0.05em] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-point-500 ${
                  // The second half laps 12px over the first. Its padding covers
                  // that, so neither label slides under the active pill.
                  index > 0 ? "-ml-3" : ""
                } ${
                  active
                    ? "z-10 rounded-full text-white shadow-[0_1px_4px_rgba(0,0,0,0.25)]"
                    : "rounded-none text-zinc-500 hover:text-zinc-700"
                }`}
                style={active ? { background } : undefined}
              >
                {pending && (
                  <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden />
                )}
                <span className="whitespace-nowrap">{label}</span>
              </button>
            );
          })}
        </div>

        {/* 2. The popup trigger — unchanged: names the store and opens the
            panel of store cards. The admin's bobbing nudge sits right above
            this button (client's note: it points at the trigger, not the
            toggle). */}
        <div className="relative">
          <StoreNudge
            nudge={content.nudge}
            className="pointer-events-none absolute -top-[30px] left-3 max-[1200px]:hidden"
          />
          <button
            type="button"
            onClick={() => {
              if (!open && ref.current) {
                const phone = window.innerWidth < 768;
                setPanelLeft(
                  phone ? 12 - ref.current.getBoundingClientRect().left : null,
                );
              }
              setOpen((v) => !v);
            }}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={`Store: ${activeBlock?.title ?? version}. Change store`}
            title={`Store: ${activeBlock?.title ?? version}`}
            className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-zinc-200 bg-zinc-50 pl-2.5 pr-2 text-[12px] font-semibold text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-white"
          >
            {pendingTo ? (
              <Loader2
                className="h-3.5 w-3.5 animate-spin text-point-500"
                aria-hidden
              />
            ) : (
              <Globe className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
            )}
            <span className="text-zinc-900 max-[374px]:hidden">
              {activeBlock?.title ?? version}
            </span>
            {/* The currency is the first thing to go where the icons share the
              row with the menu. */}
            <span className="text-zinc-400 max-md:hidden min-[1200px]:max-[1679px]:hidden">
              {activeBlock?.currency}
            </span>
          </button>
        </div>
      </div>

      {open && (
        <div
          role="menu"
          aria-label="Choose store"
          className={`absolute right-0 top-full z-50 mt-2 ${STORE_PICKER_PANEL_CLASS}`}
          style={
            panelLeft == null
              ? undefined
              : { left: panelLeft, right: "auto", width: "calc(100vw - 24px)" }
          }
        >
          <div className="mb-3 px-1 text-center">
            <p className="text-sm font-semibold text-ink">{content.title}</p>
            {content.subtitle && (
              <p className="mt-0.5 text-xs text-[#888]">{content.subtitle}</p>
            )}
          </div>
          <StorePickerCards
            content={content}
            activeStore={version}
            onChoose={choose}
          />
        </div>
      )}
    </div>
  );
}
