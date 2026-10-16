"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  setCategoryPageBanners,
  setCategoryPageDefaults,
} from "@/app/admin/pages/actions";
import {
  BannerBlocksFields,
  type AdminBannerOption,
  type BannerBlocksValue,
} from "@/components/admin/banner-blocks-fields";
import { categoryPageBlocksFor } from "@/lib/category-page-blocks";
import { notify } from "@/lib/toast";
import type { SiteVersion } from "@/lib/site-version";

/** The stores the storefront serves, in the order the tabs show them. */
const VERSIONS: { key: SiteVersion; label: string }[] = [
  { key: "local", label: "India" },
  { key: "global", label: "International" },
];

/** One category listing's blocks for one store. */
interface PageBlocks extends BannerBlocksValue {
  mode: "default" | "custom";
  /** Block keys this page hides ("long", "promo"). */
  hidden: string[];
}

/** A category as the screen receives it: its stored blocks, per store. */
export interface CategoryPageRow {
  id: string;
  slug: string;
  name: string;
  /** The category row's `pageBanners` JSON (both stores inside). */
  pageBanners: unknown;
}

/**
 * The category listings' page settings (client's slide 4), per store like the
 * brands page (slide 6). The first page tab is every page's default — the long
 * banner and the promo block all listings of that store show — and each listing
 * then either follows it or carries its own blocks, with the option to hide a
 * block on its own. The blocks themselves (pickers, heights, previews) are the
 * shared `BannerBlocksFields`.
 */
export function CategoryPagesSettings({
  pages,
  defaults,
  banners,
  categories,
  initialId,
}: {
  pages: CategoryPageRow[];
  defaults: Record<SiteVersion, BannerBlocksValue>;
  banners: AdminBannerOption[];
  /** Every category, so the pickers can name the page a banner sits on. */
  categories: { id: string; name: string }[];
  /** The page to open on (from the ?category= the admin came in with). */
  initialId?: string;
}) {
  const [version, setVersion] = useState<SiteVersion>("local");
  const [activeId, setActiveId] = useState(
    initialId && pages.some((p) => p.id === initialId)
      ? initialId
      : (pages[0]?.id ?? ""),
  );
  const [allPages, setAllPages] =
    useState<Record<SiteVersion, BannerBlocksValue>>(defaults);
  const [state, setState] = useState<
    Record<SiteVersion, Record<string, PageBlocks>>
  >(() => ({
    local: buildPages(pages, "local"),
    global: buildPages(pages, "global"),
  }));
  const [saving, setSaving] = useState(false);
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

  // What the open tab edits: the store's all-pages defaults, or the page's own.
  const storeDefaults = allPages[version];
  const draft = isAll ? storeDefaults : state[version][active!.id];
  const custom = !isAll && state[version][active!.id].mode === "custom";
  /** The pickers are live in these two states; otherwise the block previews. */
  const editing = isAll || custom;

  // A page that follows the all-pages setting previews the store's defaults
  // minus the blocks it hides; a custom page previews what it stores.
  const hidden = new Set(isAll ? [] : state[version][active!.id].hidden);
  const shown: BannerBlocksValue = editing
    ? (draft as BannerBlocksValue)
    : {
        long: hidden.has("long") ? [] : storeDefaults.long,
        promoId: hidden.has("promo") ? null : storeDefaults.promoId,
        longHeight: storeDefaults.longHeight,
        promoHeight: storeDefaults.promoHeight,
      };

  function patch(next: Partial<PageBlocks>) {
    if (isAll)
      setAllPages((d) => ({ ...d, [version]: { ...d[version], ...next } }));
    else
      setState((s) => ({
        ...s,
        [version]: {
          ...s[version],
          [active!.id]: { ...s[version][active!.id], ...next },
        },
      }));
  }

  function saveAllPages() {
    setSaving(true);
    startTransition(async () => {
      const result = await setCategoryPageDefaults({
        version,
        mode: "default",
        hidden: [],
        long: storeDefaults.long,
        longHeight: storeDefaults.longHeight,
        promoId: storeDefaults.promoId,
        promoHeight: storeDefaults.promoHeight,
      });
      setSaving(false);
      if (result.ok)
        notify.success("Saved", "Every category page follows these blocks.");
      else notify.error("Could not save", result.message);
    });
  }

  function savePage() {
    if (!active) return;
    setSaving(true);
    startTransition(async () => {
      const page = state[version][active.id];
      const result = await setCategoryPageBanners(active.id, {
        version,
        mode: page.mode,
        hidden: page.hidden as ("long" | "promo")[],
        long: page.long,
        longHeight: page.longHeight,
        promoId: page.promoId,
        promoHeight: page.promoHeight,
      });
      setSaving(false);
      if (result.ok) notify.success("Saved", `${active.name} page updated.`);
      else notify.error("Could not save", result.message);
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {VERSIONS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setVersion(v.key)}
            aria-pressed={version === v.key}
            className={`h-8 rounded px-3 text-sm font-medium transition-colors ${
              version === v.key
                ? "bg-point-500 text-white"
                : "border border-zinc-200 bg-white text-zinc-600 hover:border-point-500 hover:text-point-500"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveId("all")}
          aria-pressed={isAll}
          className={`h-8 rounded px-3 text-sm font-medium transition-colors ${
            isAll
              ? "bg-ink text-white"
              : "border border-zinc-200 bg-white text-zinc-600 hover:border-ink hover:text-ink"
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
                ? "bg-ink text-white"
                : "border border-zinc-200 bg-white text-zinc-600 hover:border-ink hover:text-ink"
            }`}
          >
            {page.name}
          </button>
        ))}
      </div>

      {/* The blocks pick from the banners the Banners admin owns, so the way to
          add another option is right here. */}
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
          These blocks render on every{" "}
          {VERSIONS.find((v) => v.key === version)?.label.toLowerCase()}{" "}
          category page that has not been customised.
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
                aria-pressed={state[version][active!.id].mode === mode}
                className={`h-8 rounded px-3 text-xs font-medium transition-colors ${
                  state[version][active!.id].mode === mode
                    ? "bg-point-500 text-white"
                    : "border border-zinc-200 bg-white text-zinc-600 hover:border-point-500 hover:text-point-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {state[version][active!.id].mode === "default" && (
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
                    checked={state[version][active!.id].hidden.includes(key)}
                    onChange={(e) => {
                      const next = new Set(state[version][active!.id].hidden);
                      if (e.target.checked) next.add(key);
                      else next.delete(key);
                      patch({ hidden: [...next] });
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

      <BannerBlocksFields
        banners={banners}
        value={shown}
        onChange={patch}
        editable={editing}
        ownerId={null}
        ownerNames={categoryNames}
      />

      <div className="flex flex-wrap items-center gap-3">
        {isAll ? (
          <button
            type="button"
            onClick={saveAllPages}
            disabled={saving}
            className="h-9 rounded bg-point-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save for all category pages"}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={savePage}
              disabled={saving}
              className="h-9 rounded bg-point-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
            >
              {saving ? "Saving…" : `Save ${active!.name}`}
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

/** The stored `pageBanners` JSON → one store's editable blocks, per category. */
function buildPages(
  pages: CategoryPageRow[],
  version: SiteVersion,
): Record<string, PageBlocks> {
  return Object.fromEntries(
    pages.map((p) => {
      const config = categoryPageBlocksFor(p.pageBanners, version);
      return [
        p.id,
        {
          mode: config.mode,
          hidden: config.hidden,
          long: config.long,
          longHeight: config.longHeight,
          promoId: config.promoId,
          promoHeight: config.promoHeight,
        },
      ];
    }),
  );
}
