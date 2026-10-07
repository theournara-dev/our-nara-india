"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Globe, Loader2, X } from "lucide-react";
import { useSiteVersion } from "@/components/site-version-provider";
import { StorePickerCards } from "@/components/layout/store-picker-cards";
import { notify } from "@/lib/toast";
import { SITE_DOMAINS, type SiteVersion } from "@/lib/site-version";
import type { SwitcherContent } from "@/lib/site-content";

/**
 * Store picker. The header chip shows the current store; opening it presents a
 * full popup with one card per store (content is admin-editable per store in
 * /admin/site). Choosing the other store toggles the runtime version in
 * development and navigates to the other domain in production.
 *
 * Rendered through a portal: the header is `overflow-x-clip`'d, which would
 * otherwise clip a fixed-position overlay.
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
  const isDev = process.env.NODE_ENV !== "production";

  // Closing on Escape while locking the page scroll behind the popup.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
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
    <>
      <div className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
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
          <span className="text-zinc-900">{activeBlock?.title ?? version}</span>
          <span className="text-zinc-400">{activeBlock?.currency}</span>
        </button>
      </div>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={content.title}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/45 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="absolute right-4 top-4 z-10 text-zinc-400 transition-colors hover:text-zinc-900"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>

              <div className="px-8 pb-6 pt-8 text-center">
                <h2 className="font-display text-2xl font-semibold text-ink">
                  {content.title}
                </h2>
                {content.subtitle && (
                  <p className="mt-2 text-sm text-[#888]">{content.subtitle}</p>
                )}
              </div>

              <div className="px-8 pb-8">
                <StorePickerCards
                  content={content}
                  activeStore={version}
                  onChoose={choose}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
