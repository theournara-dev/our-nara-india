"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BrandDirectory } from "@/components/brands/brand-directory";
import { BrandLetterNav } from "@/components/brands/brand-letter-nav";
import type { BrandSummary } from "@/data/brands";
import type { BrandsPageContent } from "@/lib/site-content";
import { groupBrandsByLetter } from "@/lib/brand-index";

type TabKey = "all" | "ONLY_AT_OURNARA" | "NEW_LAUNCH";

/** The client's slide 8 tabs, in order. */
const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "ONLY_AT_OURNARA", label: "Only At Ournara" },
  { key: "NEW_LAUNCH", label: "New Launch" },
];

/** Literal classes so Tailwind can see every column count. */
const COLUMN_CLASS: Record<number, string> = {
  2: "grid-cols-2 lg:grid-cols-2",
  3: "grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 lg:grid-cols-5",
  6: "grid-cols-2 lg:grid-cols-6",
};

/**
 * The /brands directory below the title (client slides 8): the three group
 * tabs sit directly under the heading, the promo banners follow them, then the
 * tab's brand preview tiles (name slides up on hover), the A–Z circles and the
 * plain brand list. Tile height and the number of previews come from Site
 * settings → Brands page.
 */
export function BrandBrowser({
  brands,
  preview,
  topBanners,
}: {
  brands: BrandSummary[];
  preview: BrandsPageContent;
  /** The banner row, rendered by the page under the tabs. */
  topBanners?: React.ReactNode;
}) {
  const [tab, setTab] = useState<TabKey>("all");

  const visible = useMemo(
    () =>
      (tab === "all" ? brands : brands.filter((b) => b.group === tab))
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [brands, tab],
  );
  const groups = useMemo(() => groupBrandsByLetter(visible), [visible]);
  const activeKeys = useMemo(
    () => new Set(groups.map((group) => group.key)),
    [groups],
  );
  const previewCount = preview.previewColumns * preview.previewRows;
  const previewBrands = visible.slice(0, previewCount);
  const columnClass = COLUMN_CLASS[preview.previewColumns] ?? COLUMN_CLASS[4];

  return (
    <div>
      {/* The three group tabs sit right under the title (the client's slide-8
          layout); the page's banners follow them. */}
      <div
        role="tablist"
        aria-label="Brand groups"
        className="flex w-full border-b border-[#eee]"
      >
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={`flex-1 cursor-pointer border-b-2 px-3 py-3 text-center text-sm font-semibold transition-colors md:text-base ${
                active
                  ? "border-point-500 text-[#222]"
                  : "border-transparent text-[#888] hover:text-[#222]"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {topBanners && <div className="mt-[30px]">{topBanners}</div>}

      {/* The tab's preview tiles: each shows the brand image at the height
          set in the admin; the name slides up from the bottom on hover. */}
      {previewBrands.length > 0 ? (
        <ul className={`mt-[30px] grid gap-3 md:gap-4 ${columnClass}`}>
          {previewBrands.map((brand) => (
            <BrandPreview
              key={brand.slug}
              brand={brand}
              height={preview.previewHeight}
            />
          ))}
        </ul>
      ) : (
        <p className="py-[80px] text-center text-sm text-zinc-400">
          No brands in this group yet.
        </p>
      )}

      {/* A–Z index, then the plain list. */}
      <BrandLetterNav activeKeys={activeKeys} />
      {groups.length > 0 && (
        <div className="mt-[45px]">
          <BrandDirectory groups={groups} />
        </div>
      )}
    </div>
  );
}

function BrandPreview({
  brand,
  height,
}: {
  brand: BrandSummary;
  height: number;
}) {
  return (
    <li>
      <Link
        href={`/brand/${brand.slug}`}
        className="group relative block overflow-hidden rounded-xl bg-[#f6f6f6]"
        style={{ height }}
      >
        {brand.logoUrl ? (
          <>
            <Image
              src={brand.logoUrl}
              alt={brand.name}
              fill
              unoptimized
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            {/* Hidden at rest; the name slides up on hover. */}
            <span className="absolute inset-x-0 bottom-0 translate-y-full bg-black/55 px-3 py-2 text-center text-sm font-semibold text-white transition-transform duration-300 group-hover:translate-y-0">
              {brand.name}
            </span>
          </>
        ) : (
          // Without artwork the tile is the name alone.
          <span className="grid h-full place-items-center px-4 text-center font-display text-xl font-semibold text-[#222] transition-colors group-hover:text-point-500">
            {brand.name}
          </span>
        )}
      </Link>
    </li>
  );
}
