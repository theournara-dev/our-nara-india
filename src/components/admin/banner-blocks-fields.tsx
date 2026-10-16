"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { BannerArtwork } from "@/components/banners/banner-artwork";
import { PLACEMENT_LABELS, type BannerPlacement } from "@/app/admin/banners/lib";
import {
  LONG_BANNER_PREVIEW_RADIUS,
  longBannerCellBox,
} from "@/lib/long-banner";

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
  /** The page it sits on right now (a category); null when elsewhere. */
  categoryId: string | null;
  style: string;
  heading: string | null;
  subheading: string | null;
  textAlign: string;
  textVAlign: string;
  textColor: string | null;
  scrim: boolean;
}

/** What the pickers edit: one long banner and one promo block. */
export interface BannerBlocksValue {
  long: string[];
  promoId: string | null;
  longHeight: number;
  promoHeight: number;
}

/** Where a banner sits right now, when that is not this page. */
function bannerHome(
  banner: AdminBannerOption,
  ownerId: string | null,
  ownerNames: Map<string, string>,
): string | null {
  if (banner.categoryId === ownerId) return null;
  if (banner.categoryId) {
    // Assigned to another page: what the long banner's list is claimed by.
    return ownerNames.get(banner.categoryId) ?? "another page";
  }
  // Not on a page of its own: name its current placement instead.
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
 * The long banner and promo block of one page — the same two blocks on the
 * category pages (client's slide 4) and on /brands (slide 6), so the pickers,
 * the heights and the previews are one component. `editable` is false on a page
 * that follows another configuration: it then just previews what it renders.
 */
export function BannerBlocksFields({
  banners,
  value,
  onChange,
  editable,
  ownerId,
  ownerNames,
}: {
  banners: AdminBannerOption[];
  value: BannerBlocksValue;
  onChange: (patch: Partial<BannerBlocksValue>) => void;
  editable: boolean;
  /** The page these picks belong to; null for an all-pages configuration. */
  ownerId: string | null;
  /** Page names, so a picker can say which page a banner sits on. */
  ownerNames: Map<string, string>;
}) {
  const [query, setQuery] = useState("");
  const selected = new Set(value.long);
  const filtered = banners.filter((b) =>
    b.title.toLowerCase().includes(query.trim().toLowerCase()),
  );
  // The strip renders at most three columns, so it picks at most three.
  const atCap = value.long.length >= 3;

  /** Checkbox toggle; keeps the picks in list order (their column order). */
  function toggleLong(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else if (!atCap) next.add(id);
    onChange({
      long: banners.filter((b) => next.has(b.id)).map((b) => b.id),
    });
  }

  return (
    <>
      <section className="rounded-2xl border border-zinc-100 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900">
          Long banner
        </h2>
        <p className="mb-4 text-xs text-zinc-400">
          Between the title and the filters. One banner per column: one runs
          full width, two or three share the row and phones stack them. Up to
          three. Banner images and any text over them are edited in{" "}
          <Link href="/admin/banners" className="text-point-500">
            Banners
          </Link>
          .
        </p>

        {editable && (
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
                  const home = bannerHome(b, ownerId, ownerNames);
                  const checked = selected.has(b.id);
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
                {value.long.length} of 3 selected
              </span>
              <label className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-500">Height (px)</span>
                <input
                  type="number"
                  min={0}
                  max={600}
                  value={value.longHeight}
                  onChange={(e) =>
                    onChange({
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
            ids={value.long}
            height={value.longHeight}
            banners={banners}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-100 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900">
          Promo block
        </h2>
        <p className="mb-4 text-xs text-zinc-400">
          One banner image under the long banner — empty until you pick one. It
          links to the banner&apos;s own destination when it has one.
        </p>

        {editable && (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Image</span>
              {/* Every banner is offered, including ones other blocks use:
                  the promo references them instead of claiming them. */}
              <select
                value={value.promoId ?? ""}
                onChange={(e) =>
                  onChange({ promoId: e.target.value || null })
                }
                className={inputCls}
              >
                <option value="">None</option>
                {banners.map((b) => {
                  const home = bannerHome(b, ownerId, ownerNames);
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
                value={value.promoHeight}
                onChange={(e) =>
                  onChange({
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
            banner={banners.find((b) => b.id === value.promoId)}
            height={value.promoHeight}
          />
        </div>
      </section>
    </>
  );
}
