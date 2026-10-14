"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BrandDirectory } from "@/components/brands/brand-directory";
import { BrandLetterNav } from "@/components/brands/brand-letter-nav";
import type { BrandSummary } from "@/data/brands";
import { groupBrandsByLetter } from "@/lib/brand-index";

type TabKey = "all" | "ONLY_AT_OURNARA" | "NEW_LAUNCH";

/** The client's slide 8 tabs, in order. */
const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "ONLY_AT_OURNARA", label: "Only At Ournara" },
  { key: "NEW_LAUNCH", label: "New Launch" },
];

/**
 * The /brands directory below the banners (client slide 8): full-width group
 * tabs whose active state is a bottom border, the tab's brand preview images
 * (name slides up on hover), the A–Z circles and then the plain brand list.
 */
export function BrandBrowser({ brands }: { brands: BrandSummary[] }) {
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

  return (
    <div>
      {/* Tabs span the content width; the active one is underlined. */}
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

      {/* The tab's preview images: each fills its block, the brand name
          slides up from the bottom on hover. */}
      {visible.length > 0 ? (
        <ul className="mt-[30px] grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {visible.map((brand) => (
            <BrandPreview key={brand.slug} brand={brand} />
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

function BrandPreview({ brand }: { brand: BrandSummary }) {
  return (
    <li>
      <Link
        href={`/brand/${brand.slug}`}
        className="group relative block aspect-square overflow-hidden rounded-2xl bg-[#f6f6f6]"
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
