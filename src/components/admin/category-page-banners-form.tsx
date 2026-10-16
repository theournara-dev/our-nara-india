"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  setCategoryPageBanners,
  type CategoryPageBanners,
} from "@/app/admin/pages/actions";
import { PLACEMENT_LABELS, type BannerPlacement } from "@/app/admin/banners/lib";
import { notify } from "@/lib/toast";

const inputCls =
  "h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500";

export interface AdminBannerOption {
  id: string;
  title: string;
  image: string;
  placement: string;
  /** The category page it sits on right now; null when it sits elsewhere. */
  categoryId: string | null;
}

/**
 * Where a banner sits right now, when that is somewhere other than this page —
 * picking it here moves it, so the pickers say so.
 */
function bannerHome(
  banner: AdminBannerOption,
  categoryId: string,
  categoryNames: Map<string, string>,
): string | null {
  if (banner.categoryId === categoryId) return null;
  if (banner.categoryId) {
    // Assigned to another page: picking it here moves it away.
    return categoryNames.get(banner.categoryId) ?? "another category";
  }
  // Not on a category page at all: name its current placement instead.
  return PLACEMENT_LABELS[banner.placement as BannerPlacement] ?? null;
}

/**
 * The page settings of one top-level category listing (client's slide 4): the
 * top pair, the long banner below the filter tiles (one banner per column, up
 * to three — the same strip the home page uses) and the single ad block under
 * it, plus the two heights. Lives under Pages; /admin/categories is only the
 * category tree. A banner can only sit on one page, so picking it here moves it.
 */
export function CategoryPageBannersForm({
  categoryId,
  categoryName,
  categorySlug,
  banners,
  categories,
  initial,
}: {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  banners: AdminBannerOption[];
  /** The other categories, so the pickers can name the page a banner sits on. */
  categories: { id: string; name: string }[];
  initial: {
    top: string[];
    long: string[];
    ad: string[];
    longHeight: number;
    adHeight: number;
  };
}) {
  const [top, setTop] = useState<string[]>(initial.top);
  const [long, setLong] = useState<string[]>(initial.long);
  const [ad, setAd] = useState<string[]>(initial.ad);
  const [longHeight, setLongHeight] = useState(initial.longHeight);
  const [adHeight, setAdHeight] = useState(initial.adHeight);
  const [query, setQuery] = useState("");
  const [saving, startSaving] = useTransition();

  const categoryNames = useMemo(
    () => new Map<string, string>(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const selectedLong = new Set(long);
  const filtered = banners.filter((b) =>
    b.title.toLowerCase().includes(query.trim().toLowerCase()),
  );
  // The strip renders at most three columns, so it picks at most three.
  const atCap = long.length >= 3;

  /** Set one of the two top slots ("" clears it) and keep the pair dense. */
  function setTopSlot(slot: 0 | 1, id: string) {
    const next = [top[0] ?? "", top[1] ?? ""];
    next[slot] = id;
    setTop(next.filter(Boolean));
  }

  /** Checkbox toggle; keeps the picks in list order (their column order). */
  function toggleLong(id: string) {
    const next = new Set(selectedLong);
    if (next.has(id)) next.delete(id);
    else if (!atCap) next.add(id);
    setLong(banners.filter((b) => next.has(b.id)).map((b) => b.id));
  }

  function save() {
    const payload: CategoryPageBanners = {
      top,
      long,
      ad,
      longHeight,
      adHeight,
    };
    startSaving(async () => {
      const result = await setCategoryPageBanners(categoryId, payload);
      if (result.ok) notify.success("Saved", `${categoryName} page updated.`);
      else notify.error("Could not save", result.message);
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-zinc-100 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900">
          Banners on this page
        </h2>
        <p className="mb-4 text-xs text-zinc-400">
          Every block renders under the mid-level filter tiles, above the
          products. A banner can only sit on one page; picking it here moves it.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {([0, 1] as const).map((slot) => (
            <label key={slot} className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-500">
                Top banner {slot + 1}
              </span>
              <select
                value={top[slot] ?? ""}
                onChange={(e) => setTopSlot(slot, e.target.value)}
                className={inputCls}
              >
                <option value="">None</option>
                {banners.map((b) => {
                  const home = bannerHome(b, categoryId, categoryNames);
                  // The pair holds two slots: keep the sibling's pick out.
                  const taken = slot === 0 ? top[1] : top[0];
                  return (
                    <option key={b.id} value={b.id} disabled={b.id === taken}>
                      {home ? `${b.title} · ${home}` : b.title}
                    </option>
                  );
                })}
              </select>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-100 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900">
          Long banner
        </h2>
        <p className="mb-4 text-xs text-zinc-400">
          One banner per column: one runs full width, two or three share the row
          and phones stack them. Up to three. Its banners carry their own
          heading, text placement and colour — those are edited in{" "}
          <Link href="/admin/banners" className="text-point-500">
            Banners
          </Link>
          .
        </p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search banners…"
          className={inputCls}
        />
        {/* Scrollable like the page-builder pickers so the page stays short. */}
        <div className="mt-1 max-h-56 overflow-y-auto rounded border border-zinc-200">
          {filtered.length === 0 ? (
            <p className="px-2 py-2 text-xs text-zinc-400">No banners match.</p>
          ) : (
            filtered.map((b) => {
              const home = bannerHome(b, categoryId, categoryNames);
              return (
                <label
                  key={b.id}
                  className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedLong.has(b.id)}
                    disabled={!selectedLong.has(b.id) && atCap}
                    onChange={() => toggleLong(b.id)}
                    className="h-4 w-4 rounded border-zinc-300 accent-point-500"
                  />
                  <Image
                    src={b.image}
                    alt=""
                    width={40}
                    height={24}
                    unoptimized
                    className="h-6 w-10 shrink-0 rounded object-cover"
                  />
                  <span className="min-w-0 flex-1 truncate">{b.title}</span>
                  {home && (
                    <span className="shrink-0 text-xs text-zinc-400">
                      {home}
                    </span>
                  )}
                </label>
              );
            })
          )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-zinc-400">
            {long.length} of 3 selected
          </span>
          <label className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500">Height (px)</span>
            <input
              type="number"
              min={0}
              max={600}
              value={longHeight}
              onChange={(e) =>
                setLongHeight(
                  Math.max(0, Math.min(600, Number(e.target.value) || 0)),
                )
              }
              className={`${inputCls} w-24`}
            />
          </label>
        </div>
        <span className="mt-1 block text-xs text-zinc-400">
          Height 0 keeps each banner&apos;s own proportions.
        </span>
      </section>

      <section className="rounded-2xl border border-zinc-100 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900">Ad block</h2>
        <p className="mb-4 text-xs text-zinc-400">
          One image below the long banner. It links to the banner&apos;s own
          destination when it has one.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-500">
              Image
            </span>
            <select
              value={ad[0] ?? ""}
              onChange={(e) => setAd(e.target.value ? [e.target.value] : [])}
              className={inputCls}
            >
              <option value="">None</option>
              {banners
                .filter((b) => !top.includes(b.id) && !selectedLong.has(b.id))
                .map((b) => {
                  const home = bannerHome(b, categoryId, categoryNames);
                  return (
                    <option key={b.id} value={b.id}>
                      {home ? `${b.title} · ${home}` : b.title}
                    </option>
                  );
                })}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-500">
              Height (px)
            </span>
            <input
              type="number"
              min={0}
              max={600}
              value={adHeight}
              onChange={(e) =>
                setAdHeight(
                  Math.max(0, Math.min(600, Number(e.target.value) || 0)),
                )
              }
              className={inputCls}
            />
            <span className="mt-1 block text-xs text-zinc-400">
              0 keeps the artwork&apos;s own proportions.
            </span>
          </label>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="h-9 rounded bg-point-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <Link
          href={`/category/${categorySlug}`}
          className="text-sm text-point-500 hover:underline"
        >
          View the page →
        </Link>
      </div>
    </div>
  );
}
