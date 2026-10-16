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
import { notify } from "@/lib/toast";

/** One category listing's page settings, as the screen receives them. */
export interface CategoryPageSettings extends BannerBlocksValue {
  id: string;
  slug: string;
  name: string;
  /** "default" follows the all-pages blocks, "custom" uses this page's own. */
  mode: "default" | "custom";
  /** Block keys this page hides ("long", "promo"). */
  hidden: string[];
}

/**
 * The category listings' page settings (client's slide 4). The first tab is
 * every page's default — the long banner and the promo block all listings show
 * — and each listing then either follows it or carries its own blocks, with the
 * option to hide a block on its own. The blocks themselves (pickers, heights,
 * previews) are the shared `BannerBlocksFields`, the same component /brands
 * uses.
 */
export function CategoryPagesSettings({
  pages,
  defaults,
  banners,
  categories,
  initialId,
}: {
  pages: CategoryPageSettings[];
  defaults: BannerBlocksValue;
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
  const [allPages, setAllPages] = useState<BannerBlocksValue>(defaults);
  const [state, setState] = useState<Record<string, CategoryPageSettings>>(() =>
    Object.fromEntries(pages.map((p) => [p.id, { ...p }])),
  );
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
  /** The pickers are live in these two states; otherwise the block previews. */
  const editing = isAll || custom;

  // A page that follows the all-pages setting previews the defaults minus the
  // blocks it hides; a custom page previews what it stores.
  const hidden = new Set(isAll ? [] : state[active!.id].hidden);
  const shown: BannerBlocksValue = editing
    ? (draft as BannerBlocksValue)
    : {
        long: hidden.has("long") ? [] : allPages.long,
        promoId: hidden.has("promo") ? null : allPages.promoId,
        longHeight: allPages.longHeight,
        promoHeight: allPages.promoHeight,
      };

  function patch(next: Partial<CategoryPageSettings>) {
    if (isAll) setAllPages((d) => ({ ...d, ...next }));
    else
      setState((s) => ({ ...s, [active!.id]: { ...s[active!.id], ...next } }));
  }

  function saveAllPages() {
    setSaving("all");
    startTransition(async () => {
      const result = await setCategoryPageDefaults({
        long: allPages.long,
        promo: allPages.promoId ?? undefined,
        longHeight: allPages.longHeight,
        promoHeight: allPages.promoHeight,
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
        long: page.long,
        promo: page.promoId ?? undefined,
        longHeight: page.longHeight,
        promoHeight: page.promoHeight,
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
                      const next = new Set(state[active!.id].hidden);
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
        ownerId={isAll ? null : active!.id}
        ownerNames={categoryNames}
      />

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
