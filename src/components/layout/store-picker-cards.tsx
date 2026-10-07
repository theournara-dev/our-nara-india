"use client";

import Image from "next/image";
import { ArrowRight, Check } from "lucide-react";
import type { SwitcherContent } from "@/lib/site-content";
import type { SiteVersion } from "@/lib/site-version";

/**
 * The two store cards inside the store picker. Shared by the storefront popup
 * and the admin preview so what an admin sees is exactly what visitors get;
 * without `onChoose` the cards render as a static preview.
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
    <div className="grid gap-4 sm:grid-cols-2">
      {content.blocks.map((block) => {
        const isActive = block.store === activeStore;
        const cardClass = `group flex h-full flex-col overflow-hidden rounded-xl border-2 bg-white text-left transition-all ${
          onChoose ? "cursor-pointer" : ""
        } ${
          isActive
            ? "shadow-md"
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
            <span className="flex flex-1 flex-col gap-2 p-5">
              <span className="flex items-center gap-2">
                <span className="text-lg font-bold text-ink">
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
                  <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-point-600">
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    Current
                  </span>
                )}
              </span>
              <span className="text-sm text-[#666]">{block.description}</span>
              <span className="text-sm font-semibold text-zinc-500">
                {block.currency}
              </span>
              <span
                className={`mt-3 inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-5 text-sm font-semibold text-white ${
                  isActive ? "opacity-60" : onChoose ? "group-hover:opacity-90" : ""
                }`}
                style={{ backgroundColor: block.accent }}
              >
                {isActive ? "You are here" : block.ctaLabel}
                {!isActive && <ArrowRight className="h-4 w-4" aria-hidden />}
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
