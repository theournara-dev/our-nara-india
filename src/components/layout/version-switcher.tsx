"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, Loader2 } from "lucide-react";
import { useSiteVersion } from "@/components/site-version-provider";
import {
  StorePickerCards,
  STORE_PICKER_PANEL_CLASS,
} from "@/components/layout/store-picker-cards";
import { notify } from "@/lib/toast";
import { SITE_DOMAINS, type SiteVersion } from "@/lib/site-version";
import type { SwitcherContent } from "@/lib/site-content";

/**
 * Store picker. The header chip shows the current store; opening it drops a
 * panel of store cards under the chip (content is admin-editable per store in
 * /admin/site). Choosing the other store toggles the runtime version in
 * development and navigates to the other domain in production.
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
        <span className="text-zinc-900 max-[374px]:hidden">
          {activeBlock?.title ?? version}
        </span>
        <span className="text-zinc-400 max-md:hidden">
          {activeBlock?.currency}
        </span>
      </button>

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
