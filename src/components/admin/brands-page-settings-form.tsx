"use client";

import { useState, useTransition } from "react";
import {
  BannerBlocksFields,
  type AdminBannerOption,
} from "@/components/admin/banner-blocks-fields";
import { saveBrandsPage } from "@/app/admin/pages/actions";
import { notify } from "@/lib/toast";
import type { BrandsPageContent } from "@/lib/site-content";
import type { SiteVersion } from "@/lib/site-version";

const inputCls =
  "h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500";
const labelCls = "mb-1 block text-xs font-medium text-zinc-500";

const VERSIONS: { key: SiteVersion; label: string }[] = [
  { key: "local", label: "India" },
  { key: "global", label: "International" },
];

/**
 * The /brands page's own settings (client's slides 4 and 6). Moved here from
 * Site settings, which keeps the store-wide content — this is about one page:
 * the long banner and promo block above the directory (the same blocks the
 * category pages use, promo empty until picked) and the preview grid under the
 * group tabs. Per store, like the rest of the site's content.
 */
export function BrandsPageSettingsForm({
  initial,
  banners,
}: {
  initial: Record<SiteVersion, BrandsPageContent>;
  /** Every banner the page's blocks can pick from. */
  banners: AdminBannerOption[];
}) {
  const [tab, setTab] = useState<SiteVersion>("local");
  const [content, setContent] = useState(initial);
  const [saving, startSaving] = useTransition();
  const current = content[tab];

  function patch(next: Partial<BrandsPageContent>) {
    setContent((c) => ({ ...c, [tab]: { ...c[tab], ...next } }));
  }

  function save() {
    startSaving(async () => {
      const result = await saveBrandsPage({
        version: tab,
        previewHeight: current.previewHeight,
        previewColumns: current.previewColumns,
        previewRows: current.previewRows,
        longBannerIds: current.longBannerIds,
        longBannerHeight: current.longBannerHeight,
        promoBannerId: current.promoBannerId ?? undefined,
        promoHeight: current.promoHeight,
      });
      if (result.ok) notify.success("Saved", "Brands page updated.");
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
            onClick={() => setTab(v.key)}
            className={`h-8 rounded px-3 text-sm font-medium transition-colors ${
              tab === v.key
                ? "bg-point-500 text-white"
                : "border border-zinc-200 bg-white text-zinc-600 hover:border-point-500 hover:text-point-500"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-zinc-100 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900">
          Preview grid
        </h2>
        <p className="mb-4 text-xs text-zinc-400">
          The brand preview grid under the group tabs on /brands: how tall each
          tile is and how many previews to show. The rest stay in the list below
          the A–Z circles.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className={labelCls}>Tile height (px)</span>
            <input
              type="number"
              min={40}
              max={600}
              value={current.previewHeight}
              onChange={(e) =>
                patch({ previewHeight: Number(e.target.value) || 100 })
              }
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Columns</span>
            <input
              type="number"
              min={2}
              max={6}
              value={current.previewColumns}
              onChange={(e) =>
                patch({ previewColumns: Number(e.target.value) || 4 })
              }
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Rows</span>
            <input
              type="number"
              min={1}
              max={10}
              value={current.previewRows}
              onChange={(e) =>
                patch({ previewRows: Number(e.target.value) || 2 })
              }
              className={inputCls}
            />
          </label>
        </div>
      </section>

      <BannerBlocksFields
        banners={banners}
        value={{
          long: current.longBannerIds,
          promoId: current.promoBannerId,
          longHeight: current.longBannerHeight,
          promoHeight: current.promoHeight,
        }}
        onChange={(next) =>
          patch({
            ...(next.long !== undefined ? { longBannerIds: next.long } : {}),
            ...(next.promoId !== undefined
              ? { promoBannerId: next.promoId }
              : {}),
            ...(next.longHeight !== undefined
              ? { longBannerHeight: next.longHeight }
              : {}),
            ...(next.promoHeight !== undefined
              ? { promoHeight: next.promoHeight }
              : {}),
          })
        }
        editable
        ownerId={null}
        ownerNames={new Map()}
      />

      <div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="h-9 rounded bg-point-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
