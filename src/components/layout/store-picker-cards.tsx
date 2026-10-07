"use client";

import Image from "next/image";
import { ArrowRight, Check } from "lucide-react";
import type { SwitcherContent } from "@/lib/site-content";
import type { SiteVersion } from "@/lib/site-version";

/**
 * Width of the store-picker panel. The switcher renders it as a dropdown
 * anchored to the header chip and the admin editor renders it as a preview, so
 * both use this one class to stay the same size.
 */
export const STORE_PICKER_PANEL_CLASS =
  "w-[min(92vw,560px)] rounded-xl border border-zinc-200 bg-white p-3 shadow-lg";

/**
 * The two store cards inside the store picker. Shared by the storefront
 * dropdown and the admin preview so what an admin sees is exactly what visitors
 * get; without `onChoose` the cards render as a static preview.
 */
export function StorePickerCards({
  content,
  activeStore,
  onChoose,
}: {
  content: SwitcherContent;
  activeStore: SiteVersion;
  onChoose?: (store: SiteVersion) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {content.blocks.map((block) => {
        const isActive = block.store === activeStore;
        const cardClass = `group flex h-full flex-col overflow-hidden rounded-lg border-2 bg-white text-left transition-all ${
          onChoose ? "cursor-pointer" : ""
        } ${
          isActive
            ? "shadow-sm"
            : "border-[#e9e9e9] " + (onChoose ? "hover:border-zinc-400" : "")
        }`;
        const cardStyle = isActive ? { borderColor: block.accent } : undefined;

        const inner = (
          <>
            {block.image && (
              <span className="block aspect-[3/1] w-full overflow-hidden bg-zinc-50">
                <Image
                  src={block.image}
                  alt=""
                  width={640}
                  height={213}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              </span>
            )}
            <span className="flex flex-1 flex-col gap-1.5 p-3">
              <span className="flex items-center gap-2">
                <span className="text-base font-bold text-ink">
                  {block.title}
                </span>
                {block.badge && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                    style={{ backgroundColor: block.accent }}
                  >
                    {block.badge}
                  </span>
                )}
                {isActive && (
                  <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-point-600">
                    <Check className="h-3 w-3" aria-hidden />
                    Current
                  </span>
                )}
              </span>
              <span className="text-xs text-[#666]">{block.description}</span>
              <span className="text-xs font-semibold text-zinc-500">
                {block.currency}
              </span>
              <span
                className={`mt-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-xs font-semibold text-white ${
                  isActive
                    ? "opacity-60"
                    : onChoose
                      ? "group-hover:opacity-90"
                      : ""
                }`}
                style={{ backgroundColor: block.accent }}
              >
                {isActive ? "You are here" : block.ctaLabel}
                {!isActive && (
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                )}
              </span>
            </span>
          </>
        );

        if (!onChoose) {
          return (
            <div key={block.id} className={cardClass} style={cardStyle}>
              {inner}
            </div>
          );
        }

        return (
          <button
            key={block.id}
            type="button"
            onClick={() => onChoose(block.store)}
            aria-current={isActive}
            className={cardClass}
            style={cardStyle}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}
