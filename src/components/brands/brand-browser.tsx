"use client";

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
 * The /brands directory below the banners: the group tabs (All / Only At
 * Ournara / New Launch) filter the brand tile grid, which stays grouped by
 * letter; the A–Z index under the grid follows the active tab.
 */
export function BrandBrowser({ brands }: { brands: BrandSummary[] }) {
  const [tab, setTab] = useState<TabKey>("all");

  const visible = useMemo(
    () => (tab === "all" ? brands : brands.filter((b) => b.group === tab)),
    [brands, tab],
  );
  const groups = useMemo(() => groupBrandsByLetter(visible), [visible]);
  const activeKeys = useMemo(
    () => new Set(groups.map((group) => group.key)),
    [groups],
  );

  return (
    <div>
      <div
        role="tablist"
        aria-label="Brand groups"
        className="mb-[45px] flex flex-wrap justify-center gap-1.5"
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
              className={`cursor-pointer rounded-full px-5 py-2 text-sm font-semibold transition-colors md:px-7 md:text-base ${
                active
                  ? "bg-ink text-white"
                  : "bg-white text-[#555] hover:bg-zinc-100"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {groups.length > 0 ? (
        <BrandDirectory groups={groups} />
      ) : (
        <p className="py-[80px] text-center text-sm text-zinc-400">
          No brands in this group yet.
        </p>
      )}

      <BrandLetterNav activeKeys={activeKeys} />
    </div>
  );
}
