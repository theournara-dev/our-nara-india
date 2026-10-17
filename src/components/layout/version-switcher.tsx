"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useSiteVersion } from "@/components/site-version-provider";
import { notify } from "@/lib/toast";
import { SITE_DOMAINS, type SiteVersion } from "@/lib/site-version";
import type { SwitcherContent } from "@/lib/site-content";

/**
 * The store selector (client's slide: two connected buttons).
 *
 * Left is the International (K-Drop) store, right the India store, joined into
 * one pill. Each half wears its store's own top-banner background — the
 * International store's gradient and the India store's purple — so the control
 * matches the strip above the header; pressing a half switches the store (in
 * development) or goes to that store's domain (in production). The active half
 * carries a white inner ring and the other is dimmed until hovered, so the
 * current store stays readable without hiding either colour.
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
  const [pendingTo, setPendingTo] = useState<SiteVersion | null>(null);
  const isDev = process.env.NODE_ENV !== "production";

  // The India store's name is the content's own (admin-editable); the
  // International side is the K-Drop mark, as the client wrote it.
  const localTitle =
    content.blocks.find((b) => b.store === "local")?.title ?? "India";

  const options: { store: SiteVersion; label: string; background: string }[] = [
    { store: "global", label: "KDROP", background: backgrounds.global },
    { store: "local", label: localTitle, background: backgrounds.local },
  ];

  function choose(next: SiteVersion) {
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
    <div
      role="group"
      aria-label="Choose your store"
      className={`flex h-10 shrink-0 items-stretch overflow-hidden rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.18)] max-[1200px]:h-8 ${className}`}
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
            className={`relative flex items-center justify-center gap-1 px-4 text-[13px] font-bold uppercase tracking-[0.06em] text-white transition-[opacity,box-shadow] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-point-500 max-[1200px]:px-2.5 max-[1200px]:text-[11px] ${
              index === 0 ? "rounded-l-full" : "rounded-r-full"
            } ${
              active
                ? "shadow-[inset_0_0_0_2px_rgba(255,255,255,0.85)]"
                : "opacity-70 hover:opacity-100"
            }`}
            style={{ background }}
          >
            {pending && (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            )}
            <span className="whitespace-nowrap">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
