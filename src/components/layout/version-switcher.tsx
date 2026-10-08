"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Globe, Loader2 } from "lucide-react";
import { useSiteVersion } from "@/components/site-version-provider";
import {
  StorePickerCards,
  STORE_PICKER_PANEL_CLASS,
} from "@/components/layout/store-picker-cards";
import { StoreNudge } from "@/components/layout/store-nudge";
import { KDROP_LOGO_SRC } from "@/components/product/kdrop-mark";
import { notify } from "@/lib/toast";
import { SITE_DOMAINS, type SiteVersion } from "@/lib/site-version";
import type { SwitcherContent } from "@/lib/site-content";

/** The two sides of the Local / Global toggle, in display order. */
const TOGGLE_OPTIONS: { store: SiteVersion; label: string }[] = [
  { store: "local", label: "Local store" },
  { store: "global", label: "Global store" },
];

/** Width of one toggle block and of the highlight that slides under it. */
const TOGGLE_BLOCK_PX = 28;

/**
 * Store picker: the K-Drop mark, a plain Local / Global switch and the store
 * chip. The switch is a two-block control — the filled block shows which store
 * is active — and the chip names the current store and opens the panel of store
 * cards (content is admin-editable per store in /admin/site). A bobbing hint
 * above the control draws the eye to the choice. Choosing the other store
 * toggles the runtime version in development and navigates to the other domain
 * in production.
 */
export function VersionSwitcher({
  content,
  className = "",
  logoClassName = "h-3 w-auto shrink-0 max-[560px]:hidden",
}: {
  content: SwitcherContent;
  className?: string;
  /**
   * Size/visibility of the K-Drop mark that leads the control. The header hides
   * it on small phones where the row has no room; the drawer shows it always.
   */
  logoClassName?: string;
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
      <div data-store-control className="flex items-center gap-2">
        {/* Store switch — its own component, to the left of the popup button:
            the K-Drop mark, the two blocks and the current store's name. */}
        <div
          role="group"
          aria-label="Store switch"
          className="flex items-center gap-1.5"
        >
          <Image
            src={content.brandLogo || KDROP_LOGO_SRC}
            alt=""
            width={756}
            height={143}
            unoptimized
            className={logoClassName}
          />

          {/* Local / Global switch: two plain blocks, the active one filled and
              sliding across on change. */}
          <div
            className="relative flex h-7 shrink-0 items-center rounded-full border border-zinc-200 bg-zinc-100/60 p-0.5 transition-colors hover:border-zinc-300"
            style={{ width: TOGGLE_BLOCK_PX * 2 + 4 }}
          >
            {/* Sliding highlight behind the active block. */}
            <span
              aria-hidden
              className={`pointer-events-none absolute top-0.5 left-0.5 h-[22px] rounded-full shadow-sm transition-transform duration-200 ease-out ${
                version === "local" ? "bg-blue-600" : "bg-point-500"
              }`}
              style={{
                width: TOGGLE_BLOCK_PX,
                transform: `translateX(${version === "local" ? 0 : TOGGLE_BLOCK_PX}px)`,
              }}
            />
            {TOGGLE_OPTIONS.map(({ store, label }) => {
              const active = version === store;
              return (
                <button
                  key={store}
                  type="button"
                  onClick={() => choose(store)}
                  aria-pressed={active}
                  aria-label={label}
                  title={label}
                  className="relative z-10 h-[22px] cursor-pointer rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-point-500"
                  style={{ width: TOGGLE_BLOCK_PX }}
                />
              );
            })}
          </div>

          {/* The store the switch is currently on. */}
          <span
            data-store-switch-label
            className="text-[12px] font-semibold whitespace-nowrap text-zinc-900 max-[374px]:hidden"
          >
            {activeBlock?.title ?? version}
          </span>
        </div>

        {/* Popup button — unchanged: names the store and opens the panel of
            store cards. The bobbing hint (admin-editable) sits above it. */}
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
            {/* The currency is the first thing to go on the desktop widths
                where the nav and the control share the row. */}
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
