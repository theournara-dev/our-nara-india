"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  setCategoryPageBanners,
  type CategoryPageBanners,
} from "@/app/admin/pages/actions";
import {
  PLACEMENT_LABELS,
  type BannerPlacement,
} from "@/app/admin/banners/lib";
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

/** One category listing's page settings, as the screen receives them. */
export interface CategoryPageSettings {
  id: string;
  slug: string;
  name: string;
  top: string[];
  long: string[];
  ad: string[];
  /** Strip height in pixels; 0 keeps each banner's own proportions. */
  longHeight: number;
  /** Ad block height in pixels; 0 keeps the artwork's own proportions. */
  adHeight: number;
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
 * The category listings' page settings (client's slide 4): the top pair, the
 * long banner below the filter tiles (one banner per column, up to three — the
 * same strip the home page uses) and the single ad block under it, plus the two
 * heights. Every listing is configured on this one screen — pick the page on
 * the left, edit it, save it. A banner can only sit on one page, so picking it
 * here moves it.
 */
export function CategoryPagesSettings({
  pages,
  banners,
  categories,
  initialId,
}: {
  pages: CategoryPageSettings[];
  banners: AdminBannerOption[];
  /** Every category, so the pickers can name the page a banner sits on. */
  categories: { id: string; name: string }[];
  /** The page to open on (from the ?category= the admin came in with). */
  initialId?: string;
}) {
  const [activeId, setActiveId] = useState(
    initialId && pages.some((p) => p.id === initialId)
      ? initialId
      : (pages[0]?.id ?? ""),
  );
  const [state, setState] = useState<Record<string, CategoryPageSettings>>(() =>
    Object.fromEntries(pages.map((p) => [p.id, { ...p }])),
  );
  const [query, setQuery] = useState("");
  const [saving, startSaving] = useTransition();

  const categoryNames = useMemo(
    () => new Map<string, string>(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const active = pages.find((p) => p.id === activeId) ?? pages[0];
  if (!active) {
    return (
      <p className="rounded-2xl border border-dashed border-zinc-200 py-10 text-center text-sm text-zinc-400">
        No top-level categories yet — add one under Categories first.
      </p>
    );
  }

  const current = state[active.id];
  const selectedLong = new Set(current.long ?? []);
  const filtered = banners.filter((b) =>
    b.title.toLowerCase().includes(query.trim().toLowerCase()),
  );
  // The strip renders at most three columns, so it picks at most three.
  const atCap = (current.long ?? []).length >= 3;

  function patch(next: Partial<CategoryPageSettings>) {
    setState((s) => ({ ...s, [active.id]: { ...s[active.id], ...next } }));
  }

  /** Set one of the two top slots ("" clears it) and keep the pair dense. */
  function setTopSlot(slot: 0 | 1, id: string) {
    const top = current.top ?? [];
    const next = [top[0] ?? "", top[1] ?? ""];
    next[slot] = id;
    patch({ top: next.filter(Boolean) });
  }

  /** Checkbox toggle; keeps the picks in list order (their column order). */
  function toggleLong(id: string) {
    const next = new Set(selectedLong);
    if (next.has(id)) next.delete(id);
    else if (!atCap) next.add(id);
    patch({ long: banners.filter((b) => next.has(b.id)).map((b) => b.id) });
  }

  function save() {
    startSaving(async () => {
      const payload: CategoryPageBanners = {
        top: current.top ?? [],
        long: current.long ?? [],
        ad: current.ad ?? [],
        longHeight: current.longHeight ?? 0,
        adHeight: current.adHeight ?? 0,
      };
      const result = await setCategoryPageBanners(active.id, payload);
      if (result.ok) notify.success("Saved", `${active.name} page updated.`);
      else notify.error("Could not save", result.message);
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {pages.map((page) => (
          <button
            key={page.id}
            type="button"
            onClick={() => setActiveId(page.id)}
            aria-pressed={page.id === active.id}
            className={`h-8 rounded px-3 text-sm font-medium transition-colors ${
              page.id === active.id
                ? "bg-point-500 text-white"
                : "border border-zinc-200 bg-white text-zinc-600 hover:border-point-500 hover:text-point-500"
            }`}
          >
            {page.name}
          </button>
        ))}
      </div>

      <p className="text-xs text-zinc-400">
        Editing <span className="font-medium text-zinc-500">{active.name}</span>{" "}
        — /category/{active.slug}
      </p>

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
                value={current.top?.[slot] ?? ""}
                onChange={(e) => setTopSlot(slot, e.target.value)}
                className={inputCls}
              >
                <option value="">None</option>
                {banners.map((b) => {
                  const home = bannerHome(b, active.id, categoryNames);
                  // The pair holds two slots: keep the sibling's pick out.
                  const taken =
                    slot === 0 ? current.top?.[1] : current.top?.[0];
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
              const home = bannerHome(b, active.id, categoryNames);
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
            {selectedLong.size} of 3 selected
          </span>
          <label className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-500">Height (px)</span>
            <input
              type="number"
              min={0}
              max={600}
              value={current.longHeight ?? 0}
              onChange={(e) =>
                patch({
                  longHeight: Math.max(
                    0,
                    Math.min(600, Number(e.target.value) || 0),
                  ),
                })
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
              value={current.ad?.[0] ?? ""}
              onChange={(e) =>
                patch({ ad: e.target.value ? [e.target.value] : [] })
              }
              className={inputCls}
            >
              <option value="">None</option>
              {banners
                .filter(
                  (b) =>
                    !(current.top ?? []).includes(b.id) &&
                    !selectedLong.has(b.id),
                )
                .map((b) => {
                  const home = bannerHome(b, active.id, categoryNames);
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
              value={current.adHeight ?? 0}
              onChange={(e) =>
                patch({
                  adHeight: Math.max(
                    0,
                    Math.min(600, Number(e.target.value) || 0),
                  ),
                })
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
          {saving ? "Saving…" : `Save ${active.name}`}
        </button>
        <Link
          href={`/category/${active.slug}`}
          className="text-sm text-point-500 hover:underline"
        >
          View the page →
        </Link>
      </div>
    </div>
  );
}
