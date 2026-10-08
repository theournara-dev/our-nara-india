"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Globe, Loader2 } from "lucide-react";
import { useSiteVersion } from "@/components/site-version-provider";
import {
  StorePickerCards,
  STORE_PICKER_PANEL_CLASS,
} from "@/components/layout/store-picker-cards";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { SITE_DOMAINS, type SiteVersion } from "@/lib/site-version";
import type { SwitcherContent } from "@/lib/site-content";

/** "India" → "IN", "Global" → "GL": a two-letter tag for the compact toggle. */
function shortLabel(title: string, fallback: string) {
  const word = (title || fallback).trim();
  return word.slice(0, 2).toUpperCase();
}

/**
 * Store picker. The header chip shows the current store and opens a panel of
 * store cards under it (content is admin-editable per store in /admin/site).
 * Next to it sits a compact two-option toggle so a shopper can flip stores in
 * one tap without opening the panel; a bobbing arrow points at the control so
 * the choice is noticed. Choosing the other store toggles the runtime version
 * in development and navigates to the other domain in production.
 */
export function VersionSwitcher({
  content,
  className = "",
}: {
  content: SwitcherContent;
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
      // Cross-domain navigation: mark pending so the chip shows a spinner.
      setPendingTo(next);
      notify.loading(`Switching to ${target?.title ?? next}…`);
      window.location.assign(SITE_DOMAINS[next]);
    }
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Bobbing arrow, pointing down at the store control. */}
      <span
        aria-hidden
        className="store-switcher-nudge pointer-events-none absolute -top-[21px] left-1/2 hidden -translate-x-1/2 text-point-500 md:block"
      >
        <ChevronDown className="h-4 w-4" strokeWidth={3} />
      </span>

      <div className="flex items-center gap-1.5">
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
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-white"
        >
          {pendingTo ? (
            <Loader2
              className="h-3.5 w-3.5 animate-spin text-point-500"
              aria-hidden
            />
          ) : (
            <Globe className="h-3.5 w-3.5 text-zinc-500" aria-hidden />
          )}
          <span className="sr-only">
            {activeBlock?.title ?? version} — {activeBlock?.currency}
          </span>
        </button>

        {/* Two-option toggle: switch stores without opening the panel. */}
        <div
          role="group"
          aria-label="Shop location"
          className="flex h-8 shrink-0 items-center gap-0.5 rounded-full border border-zinc-200 bg-zinc-50 p-0.5"
        >
          {content.blocks.map((block) => {
            const active = block.store === version;
            return (
              <button
                key={block.store}
                type="button"
                onClick={() => choose(block.store)}
                aria-pressed={active}
                aria-label={`Switch to ${block.title}`}
                title={block.title}
                className={cn(
                  "h-6 cursor-pointer rounded-full px-2 text-[11px] font-semibold whitespace-nowrap transition-colors md:px-2.5",
                  active
                    ? "bg-point-500 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900",
                )}
              >
                <span className="hidden md:inline">{block.title}</span>
                <span className="md:hidden">
                  {shortLabel(block.title, block.store)}
                </span>
              </button>
            );
          })}
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
