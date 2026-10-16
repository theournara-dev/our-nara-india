"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from "react-icons/md";
import type { ShowcaseTab } from "@/lib/page-builder/types";
import type { ProductCard as ProductCardType } from "@/data/products";
import { ThemeProductCard } from "@/components/theme/product-card";

export interface TabbedShowcaseTab extends ShowcaseTab {
  products: ProductCardType[];
}

/** Literal classes so Tailwind can see every column count. */
const GRID_CLASS: Record<number, string> = {
  2: "grid-cols-2 lg:grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
};

/**
 * Home "Tabbed showcase" (the client's slide 2, section 4 of the home page):
 *
 * - an optional **title** above the filters (hidden while it is empty);
 * - a row of rounded **filters**, scrollable sideways when there are more than
 *   fit — each filter is attached to a brand and shows that brand's chosen
 *   products, managed in the page builder;
 * - a **square-cornered banner** at the admin's height, inside the page's
 *   left/right margins. Every filter's banner lives on one horizontal track, so
 *   picking a filter (or an arrow) **slides** to that banner rather than
 *   swapping the picture, and the visible slide is one link to the brand;
 * - the brand's product row (at most `columns × rows` items), which **fades
 *   in** on every change.
 */
export function TabbedShowcase({
  title = "",
  tabs,
  columns = 4,
  height = 400,
  moreHref,
  moreLabel,
}: {
  /** Heading above the filters; empty renders nothing. */
  title?: string;
  tabs: TabbedShowcaseTab[];
  /** Fallback columns for filters that don't set their own. */
  columns?: number;
  /** Banner height in pixels (admin-set; 400 by default). */
  height?: number;
  moreHref?: string;
  moreLabel?: string;
}) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "");
  if (tabs.length === 0) return null;
  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => t.id === activeId),
  );
  const active = tabs[activeIndex];
  const activeColumns = active.columns ?? columns;
  const gridClass = GRID_CLASS[activeColumns] ?? GRID_CLASS[4];

  /** Step the filter row, wrapping at both ends (the arrows do this). */
  function step(direction: 1 | -1) {
    const next = (activeIndex + direction + tabs.length) % tabs.length;
    setActiveId(tabs[next].id);
  }

  // Small round arrows vertically centred on the banner, matching the product
  // gallery's but a touch more solid so they read over light artwork too.
  const arrows =
    tabs.length > 1 ? (
      <>
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Previous brand"
          className="absolute left-4 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/85 text-[#333] shadow-md backdrop-blur-[2px] transition-colors duration-300 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-point-500 max-md:left-3 max-md:h-8 max-md:w-8"
        >
          <MdKeyboardArrowLeft size={20} />
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Next brand"
          className="absolute right-4 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/85 text-[#333] shadow-md backdrop-blur-[2px] transition-colors duration-300 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-point-500 max-md:right-3 max-md:h-8 max-md:w-8"
        >
          <MdKeyboardArrowRight size={20} />
        </button>
      </>
    ) : null;

  return (
    <section className="mb-[10px] mt-[100px] w-full max-[767px]:mb-5 max-[767px]:mt-[60px]">
      <div className="relative mx-auto box-border w-[92%] max-w-[1560px] px-2 max-[767px]:w-[96%]">
        {title.trim() && (
          <h2 className="mb-6 text-center font-category text-2xl font-bold tracking-tight text-ink">
            {title}
          </h2>
        )}

        {/* Filters — rounded, and the row scrolls sideways when there are more
            than fit on screen. Picking one slides the banner to it. */}
        <div
          role="tablist"
          aria-label="Brand filters"
          className="flex justify-center gap-2 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-md:justify-start"
        >
          {tabs.map((tab, index) => {
            const activeTab = index === activeIndex;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`showcase-tab-${tab.id}`}
                aria-selected={activeTab}
                aria-controls="showcase-products-panel"
                onClick={() => setActiveId(tab.id)}
                className={`shrink-0 cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition-colors md:px-6 md:text-base ${
                  activeTab
                    ? "border-ink bg-ink text-white"
                    : "border-[#e5e5e5] bg-white text-[#555] hover:border-ink hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* One track holds every banner: the track translates to the active
            slide, so filters and arrows "scroll" the strip instead of swapping
            its picture. The banner keeps the page margins and square corners,
            and slides off-screen stay out of the tab order. */}
        <div className="relative w-full overflow-hidden" style={{ height }}>
          <div
            className="flex h-full transition-transform duration-500 ease-out motion-reduce:transition-none"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {tabs.map((tab, index) => {
              const current = index === activeIndex;
              const overlay = (tab.title || tab.sub) && (
                <>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent"
                  />
                  <span className="absolute bottom-6 left-7 right-7 block text-left md:bottom-10 md:left-12">
                    {tab.title && (
                      <span className="block text-2xl font-bold leading-tight text-white drop-shadow md:text-4xl">
                        {tab.title}
                      </span>
                    )}
                    {tab.sub && (
                      <span className="mt-1 block text-sm font-medium text-white/90 drop-shadow md:text-base">
                        {tab.sub}
                      </span>
                    )}
                  </span>
                </>
              );

              return (
                <div
                  key={tab.id}
                  className="relative h-full w-full shrink-0 overflow-hidden"
                  aria-hidden={!current}
                  data-showcase-slide={index}
                >
                  {tab.image ? (
                    tab.href ? (
                      <Link
                        href={tab.href}
                        aria-hidden={!current}
                        tabIndex={current ? 0 : -1}
                        className="relative block h-full w-full"
                        aria-label={tab.title || tab.label}
                      >
                        <Image
                          src={tab.image}
                          alt={tab.alt || tab.title || tab.label}
                          width={1920}
                          height={760}
                          unoptimized
                          priority={index === 0}
                          className="h-full w-full object-cover"
                        />
                        {overlay}
                      </Link>
                    ) : (
                      <div className="relative h-full w-full">
                        <Image
                          src={tab.image}
                          alt={tab.alt || tab.title || tab.label}
                          width={1920}
                          height={760}
                          unoptimized
                          priority={index === 0}
                          className="h-full w-full object-cover"
                        />
                        {overlay}
                      </div>
                    )
                  ) : null}
                </div>
              );
            })}
          </div>
          {arrows}
        </div>

        {/* The products only fade — they are not part of the slide. Every tab
            points at this one panel; the active tab labels it. */}
        <div
          id="showcase-products-panel"
          role="tabpanel"
          aria-labelledby={`showcase-tab-${active.id}`}
        >
          <div key={active.id} className="showcase-products">
            {active.products.length > 0 && (
              <div className={`mt-8 grid gap-x-4 gap-y-8 ${gridClass}`}>
                {active.products.map((product, index) => (
                  <div key={`${active.id}-${product.id}`}>
                    <ThemeProductCard
                      product={product}
                      priority={index === 0}
                    />
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
      </div>
    </section>
  );
}
