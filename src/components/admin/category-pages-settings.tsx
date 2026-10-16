"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  setCategoryPageBanners,
  setCategoryPageDefaults,
} from "@/app/admin/pages/actions";
import { BannerArtwork } from "@/components/banners/banner-artwork";
import {
  PLACEMENT_LABELS,
  type BannerPlacement,
} from "@/app/admin/banners/lib";
import {
  LONG_BANNER_PREVIEW_RADIUS,
  longBannerCellBox,
} from "@/lib/long-banner";
import { notify } from "@/lib/toast";

const inputCls =
  "h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500";
const labelCls = "mb-1 block text-xs font-medium text-zinc-500";

/** One banner as the pickers and previews need it. */
export interface AdminBannerOption {
  id: string;
  title: string;
  image: string;
  mobileImage: string | null;
  alt: string | null;
  href: string | null;
  placement: string;
  /** The category page it sits on right now; null when it sits elsewhere. */
  categoryId: string | null;
  style: string;
  heading: string | null;
  subheading: string | null;
  textAlign: string;
  textVAlign: string;
  textColor: string | null;
  scrim: boolean;
}

/** One category listing's page settings, as the screen receives them. */
export interface CategoryPageSettings {
  id: string;
  slug: string;
  name: string;
  /** "default" follows the all-pages blocks, "custom" uses this page's own. */
  mode: "default" | "custom";
  /** Block keys this page hides ("long", "promo"). */
  hidden: string[];
  long: string[];
  /** The promo banner this page shows; null when it has none. */
  promoId: string | null;
  longHeight: number;
  promoHeight: number;
}

/** The blocks every category page shows (the all-pages configuration). */
export interface CategoryPageDefaults {
  long: string[];
  promoId: string | null;
  longHeight: number;
  promoHeight: number;
}

/** Where a banner sits right now, when that is not this page. */
function bannerHome(
  banner: AdminBannerOption,
  categoryId: string | null,
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

/** The banner content the shared artwork renderer reads. */
function contentOf(banner: AdminBannerOption) {
  return {
    image: banner.image,
    mobileImage: banner.mobileImage,
    alt: banner.alt,
    style: banner.style,
    heading: banner.heading,
    subheading: banner.subheading,
    textAlign: banner.textAlign,
    textVAlign: banner.textVAlign,
    textColor: banner.textColor,
    scrim: banner.scrim,
  };
}

function EmptyPreview({ text }: { text: string }) {
  return (
    <p className="rounded border border-dashed border-zinc-200 py-6 text-center text-xs text-zinc-400">
      {text}
    </p>
  );
}

/** The long banner strip as the page renders it, at the panel's width. */
function LongBannerPreview({
  ids,
  height,
  banners,
}: {
  ids: string[];
  height: number;
  banners: AdminBannerOption[];
}) {
  const shown = ids
    .map((id) => banners.find((b) => b.id === id))
    .filter((b): b is AdminBannerOption => Boolean(b))
    .slice(0, 3);
  if (shown.length === 0) {
    return <EmptyPreview text="No banners picked — this block is hidden." />;
  }
  const pinned = height > 0;

  return (
    <>
      <div
        className="flex w-full flex-col gap-[10px] md:flex-row"
        style={{ containerType: "inline-size" }}
      >
        {shown.map((b) => (
          <div
            key={b.id}
            className={`relative w-full overflow-hidden rounded-md bg-zinc-100 ${
              pinned ? "" : "aspect-[800/210] md:aspect-[2172/260]"
            } ${
              shown.length > 1
                ? shown.length === 2
                  ? "md:w-1/2"
                  : "md:w-1/3"
                : ""
            }`}
            style={{
              // The live 16px corner at the preview's own scale.
              borderRadius: LONG_BANNER_PREVIEW_RADIUS,
              ...(pinned
                ? {
                    aspectRatio: `${longBannerCellBox(shown.length, height).width} / ${height}`,
                  }
                : {}),
            }}
          >
            <BannerArtwork banner={contentOf(b)} />
          </div>
        ))}
      </div>
      <p className="mt-1 text-xs text-zinc-400">
        {shown.length} banner{shown.length === 1 ? "" : "s"} ·{" "}
        {pinned ? `${height}px tall` : "own proportions"}
      </p>
    </>
  );
}

/** The promo block as the page renders it: one image at the set height. */
function PromoPreview({
  banner,
  height,
}: {
  banner?: AdminBannerOption;
  height: number;
}) {
  if (!banner) {
    return <EmptyPreview text="No image picked — this block is hidden." />;
  }
  const pinned = height > 0;
  return (
    <>
      <div
        className="relative w-full overflow-hidden rounded-2xl bg-zinc-100"
        style={pinned ? { height } : undefined}
      >
        <BannerArtwork
          banner={contentOf(banner)}
          fit={pinned ? "cover" : "natural"}
        />
      </div>
      <p className="mt-1 text-xs text-zinc-400">
        {pinned ? `${height}px tall` : "the artwork's own proportions"}
      </p>
    </>
  );
}

/**
 * The category listings' page settings (client's slide 4). The first tab is
 * every page's default — the long banner and the promo block all listings show
 * — and each listing then either follows it or carries its own blocks, with the
 * option to hide a block on its own. Banner previews show both blocks as the
 * page renders them.
 */
export function CategoryPagesSettings({
  pages,
  defaults,
  banners,
  categories,
  initialId,
}: {
  pages: CategoryPageSettings[];
  defaults: CategoryPageDefaults;
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
  const [allPages, setAllPages] = useState<CategoryPageDefaults>(defaults);
  const [state, setState] = useState<Record<string, CategoryPageSettings>>(() =>
    Object.fromEntries(pages.map((p) => [p.id, { ...p }])),
  );
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState<"all" | "page" | null>(null);
  const [, startTransition] = useTransition();

  const categoryNames = useMemo(
    () => new Map<string, string>(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const isAll = activeId === "all" || pages.length === 0;
  const active = pages.find((p) => p.id === activeId);
  if (!active && !isAll) {
    return (
      <p className="rounded-2xl border border-dashed border-zinc-200 py-10 text-center text-sm text-zinc-400">
        No top-level categories yet — add one under Categories first.
      </p>
    );
  }

  // What the open tab edits: the all-pages defaults, or the page's own blocks.
  const draft = isAll ? allPages : state[active!.id];
  const custom = !isAll && state[active!.id].mode === "custom";
  /** The editor (pickers and heights) is only live in these two states. */
  const editing = isAll || custom;

  // The previews show what the page really renders: on a page that follows the
  // all-pages setting that is the all-pages blocks (minus what the page hides),
  // otherwise the tab's own blocks.
  const source = editing ? draft : allPages;
  const hidden = new Set(isAll ? [] : state[active!.id].hidden);
  const previewLongIds = (hidden.has("long") ? [] : (source.long ?? [])).slice(
    0,
    3,
  );
  const previewLongHeight = source.longHeight ?? 0;
  const previewPromoId = hidden.has("promo") ? "" : (source.promoId ?? "");
  const previewPromoHeight = source.promoHeight ?? 0;

  const filtered = banners.filter((b) =>
    b.title.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const atCap = (draft.long ?? []).length >= 3;

  function patch(
    next: Partial<CategoryPageSettings> & Partial<CategoryPageDefaults>,
  ) {
    if (isAll) setAllPages((d) => ({ ...d, ...next }));
    else
      setState((s) => ({ ...s, [active!.id]: { ...s[active!.id], ...next } }));
  }

  /** Checkbox toggle; keeps the picks in list order (their column order). */
  function toggleLong(id: string) {
    const selected = new Set(draft.long ?? []);
    if (selected.has(id)) selected.delete(id);
    else if (!atCap) selected.add(id);
    patch({
      long: banners.filter((b) => selected.has(b.id)).map((b) => b.id),
    });
  }

  function saveAllPages() {
    setSaving("all");
    startTransition(async () => {
      const result = await setCategoryPageDefaults({
        long: allPages.long ?? [],
        promo: allPages.promoId ?? undefined,
        longHeight: allPages.longHeight ?? 0,
        promoHeight: allPages.promoHeight ?? 0,
      });
      setSaving(null);
      if (result.ok)
        notify.success("Saved", "Every category page follows these blocks.");
      else notify.error("Could not save", result.message);
    });
  }

  function savePage() {
    if (!active) return;
    setSaving("page");
    startTransition(async () => {
      const page = state[active.id];
      const result = await setCategoryPageBanners(active.id, {
        mode: page.mode,
        hidden: page.hidden as ("long" | "promo")[],
        long: page.long ?? [],
        promo: page.promoId ?? undefined,
        longHeight: page.longHeight ?? 0,
        promoHeight: page.promoHeight ?? 0,
      });
      setSaving(null);
      if (result.ok) notify.success("Saved", `${active.name} page updated.`);
      else notify.error("Could not save", result.message);
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveId("all")}
          aria-pressed={isAll}
          className={`h-8 rounded px-3 text-sm font-medium transition-colors ${
            isAll
              ? "bg-point-500 text-white"
              : "border border-zinc-200 bg-white text-zinc-600 hover:border-point-500 hover:text-point-500"
          }`}
        >
          All category pages
        </button>
        {pages.map((page) => (
          <button
            key={page.id}
            type="button"
            onClick={() => setActiveId(page.id)}
            aria-pressed={page.id === active?.id}
            className={`h-8 rounded px-3 text-sm font-medium transition-colors ${
              page.id === active?.id && !isAll
                ? "bg-point-500 text-white"
                : "border border-zinc-200 bg-white text-zinc-600 hover:border-point-500 hover:text-point-500"
            }`}
          >
            {page.name}
          </button>
        ))}
      </div>

      {/* The blocks pick from the banners the Banners admin owns, so the way to
          add another option is right here (client's question). */}
      <p className="text-xs text-zinc-400">
        Every banner here comes from the{" "}
        <Link href="/admin/banners" className="text-point-500">
          Banners admin
        </Link>
        , where its image, link and any text over it are edited.{" "}
        <Link
          href="/admin/banners/new"
          target="_blank"
          rel="noreferrer"
          className="text-point-500"
        >
          Add a new banner →
        </Link>
      </p>

      {isAll ? (
        <p className="text-xs text-zinc-400">
          These blocks render on every category page that has not been
          customised.
        </p>
      ) : (
        <div className="rounded-2xl border border-zinc-100 bg-white p-5">
          <p className="text-xs text-zinc-400">
            Editing{" "}
            <span className="font-medium text-zinc-500">{active!.name}</span> —
            /category/{active!.slug}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ["default", "Use the all-pages setting"],
                ["custom", "Customise this page"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => patch({ mode })}
                aria-pressed={state[active!.id].mode === mode}
                className={`h-8 rounded px-3 text-xs font-medium transition-colors ${
                  state[active!.id].mode === mode
                    ? "bg-ink text-white"
                    : "border border-zinc-200 bg-white text-zinc-600 hover:border-ink hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {state[active!.id].mode === "default" && (
            <div className="mt-3 space-y-1.5">
              <p className="text-xs text-zinc-400">
                Hide a block on this page while the rest keeps following the
                all-pages setting:
              </p>
              {(
                [
                  ["long", "Hide the long banner on this page"],
                  ["promo", "Hide the promo block on this page"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 text-sm text-zinc-700"
                >
                  <input
                    type="checkbox"
                    checked={state[active!.id].hidden.includes(key)}
                    onChange={(e) => {
                      const hidden = new Set(state[active!.id].hidden);
                      if (e.target.checked) hidden.add(key);
                      else hidden.delete(key);
                      patch({ hidden: [...hidden] });
                    }}
                    className="h-4 w-4 rounded border-zinc-300 accent-point-500"
                  />
                  {label}
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Long banner ─────────────────────────────────────────────────── */}
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

        {(isAll || custom) && (
          <>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search banners…"
              className={inputCls}
            />
            {/* Scrollable like the page-builder pickers, so the page stays short. */}
            <div className="mt-1 max-h-56 overflow-y-auto rounded border border-zinc-200">
              {filtered.length === 0 ? (
                <p className="px-2 py-2 text-xs text-zinc-400">
                  No banners match.
                </p>
              ) : (
                filtered.map((b) => {
                  const home = bannerHome(
                    b,
                    isAll ? null : active!.id,
                    categoryNames,
                  );
                  const checked = (draft.long ?? []).includes(b.id);
                  return (
                    <label
                      key={b.id}
                      className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!checked && atCap}
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
                {(draft.long ?? []).length} of 3 selected
              </span>
              <label className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-500">Height (px)</span>
                <input
                  type="number"
                  min={0}
                  max={600}
                  value={draft.longHeight ?? 0}
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
          </>
        )}

        <div className="mt-4">
          <span className={labelCls}>Preview</span>
          <LongBannerPreview
            ids={previewLongIds}
            height={previewLongHeight}
            banners={banners}
          />
        </div>
      </section>

      {/* ── Promo block ─────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-zinc-100 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900">
          Promo block
        </h2>
        <p className="mb-4 text-xs text-zinc-400">
          One banner image under the long banner — any banner can be a promo,
          and new ones are added in the Banners admin. It links to the
          banner&apos;s own destination when it has one.
        </p>

        {(isAll || custom) && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Image</span>
              {/* Every banner is offered, including ones the long banner uses:
                  the promo references them instead of claiming them. */}
              <select
                value={draft.promoId ?? ""}
                onChange={(e) => patch({ promoId: e.target.value || null })}
                className={inputCls}
              >
                <option value="">None</option>
                {banners.map((b) => {
                  const home = bannerHome(
                    b,
                    isAll ? null : active!.id,
                    categoryNames,
                  );
                  return (
                    <option key={b.id} value={b.id}>
                      {home ? `${b.title} · ${home}` : b.title}
                    </option>
                  );
                })}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Height (px)</span>
              <input
                type="number"
                min={0}
                max={600}
                value={draft.promoHeight ?? 0}
                onChange={(e) =>
                  patch({
                    promoHeight: Math.max(
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
        )}

        <div className="mt-4">
          <span className={labelCls}>Preview</span>
          <PromoPreview
            banner={banners.find((b) => b.id === previewPromoId)}
            height={previewPromoHeight}
          />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        {isAll ? (
          <button
            type="button"
            onClick={saveAllPages}
            disabled={saving !== null}
            className="h-9 rounded bg-point-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
          >
            {saving === "all" ? "Saving…" : "Save for all category pages"}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={savePage}
              disabled={saving !== null}
              className="h-9 rounded bg-point-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
            >
              {saving === "page" ? "Saving…" : `Save ${active!.name}`}
            </button>
            <Link
              href={`/category/${active!.slug}`}
              className="text-sm text-point-500 hover:underline"
            >
              View the page →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
