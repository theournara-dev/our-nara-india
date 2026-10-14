"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ShowcaseTab } from "@/lib/page-builder/types";
import type { ProductCard as ProductCardType } from "@/data/products";
import { ThemeProductCard } from "@/components/theme/product-card";

export interface TabbedShowcaseTab extends ShowcaseTab {
  products: ProductCardType[];
}

const GRID_CLASS: Record<number, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
};

/**
 * Home "Tabbed showcase" (the client's slide 5): a row of category tabs; the
 * panel below swaps to that tab's banner and curated products. The banner
 * links to the brand (or whatever target the admin picked), the tab itself is
 * the category. Everything is admin-managed in the page builder.
 */
export function TabbedShowcase({
  tabs,
  columns = 4,
  height = 400,
  moreHref,
  moreLabel,
}: {
  tabs: TabbedShowcaseTab[];
  columns?: number;
  /** Banner height in pixels (admin-set; 400 by default). */
  height?: number;
  moreHref?: string;
  moreLabel?: string;
}) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");
  if (tabs.length === 0) return null;
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];
  const gridClass = GRID_CLASS[columns] ?? GRID_CLASS[4];

  return (
    <section className="mb-[10px] mt-[100px] w-full max-[767px]:mb-5 max-[767px]:mt-[60px]">
      <div className="relative mx-auto box-border w-[92%] max-w-[1560px] px-2 max-[767px]:w-[96%]">
        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Showcase categories"
          className="flex justify-center gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-md:justify-start"
        >
          {tabs.map((tab) => {
            const activeTab = tab.id === active.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab}
                onClick={() => setActiveId(tab.id)}
                className={`shrink-0 cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-colors md:px-6 md:text-base ${
                  activeTab
                    ? "bg-ink text-white"
                    : "bg-white text-[#555] hover:bg-zinc-100"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* The panel fades in on every tab change (key = active id). */}
        <div key={active.id} className="showcase-panel mt-4">
          {active.image && (
            <Link
              href={active.href || "#"}
              className="group relative block overflow-hidden rounded-2xl"
              style={{ height }}
              aria-label={active.title || active.label}
            >
              <Image
                src={active.image}
                alt={active.alt || active.title || active.label}
                width={1920}
                height={760}
                unoptimized
                priority={false}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.01]"
              />
              {(active.title || active.sub) && (
                <>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent"
                  />
                  <span className="absolute bottom-6 left-7 right-7 block text-left md:bottom-10 md:left-12">
                    {active.title && (
                      <span className="block text-2xl font-bold leading-tight text-white drop-shadow md:text-4xl">
                        {active.title}
                      </span>
                    )}
                    {active.sub && (
                      <span className="mt-1 block text-sm font-medium text-white/90 drop-shadow md:text-base">
                        {active.sub}
                      </span>
                    )}
                  </span>
                </>
              )}
            </Link>
          )}

          {active.products.length > 0 && (
            <div className={`mt-8 grid gap-x-4 gap-y-8 ${gridClass}`}>
              {active.products.map((product, index) => (
                <div key={`${active.id}-${product.id}`}>
                  <ThemeProductCard product={product} priority={index === 0} />
                </div>
              ))}
            </div>
          )}

          {moreHref && (
            <div className="mt-8 text-center">
              <Link
                href={moreHref}
                className="inline-flex h-10 items-center justify-center rounded-full border border-[#6f2dbd] bg-white px-8 text-[13px] font-medium text-[#6f2dbd] transition-colors duration-300 hover:bg-[#6f2dbd] hover:text-white"
              >
                {moreLabel || "VIEW MORE →"}
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
