"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { notify } from "@/lib/toast";
import { toDatetimeLocal } from "@/lib/datetime";
import { ImageField } from "@/components/admin/image-field";
import {
  createBanner,
  updateBanner,
  type BannerInput,
} from "@/app/admin/banners/actions";
import { BANNER_PLACEMENTS, PLACEMENT_LABELS } from "@/app/admin/banners/lib";

const inputCls =
  "h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500";
const labelCls = "mb-1 block text-xs font-medium text-zinc-500";

type BannerModel = {
  id: string;
  title: string;
  placement: string;
  image: string;
  mobileImage: string | null;
  alt: string | null;
  href: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
};

export function BannerForm({
  banner,
  backHref,
}: {
  banner: BannerModel | null;
  backHref: string;
}) {
  const isEdit = Boolean(banner);
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(banner?.title ?? "");
  const [placement, setPlacement] = useState(banner?.placement ?? "long");
  const [image, setImage] = useState(banner?.image ?? "");
  const [mobileImage, setMobileImage] = useState(banner?.mobileImage ?? "");
  const [alt, setAlt] = useState(banner?.alt ?? "");
  const [href, setHref] = useState(banner?.href ?? "");
  const [sortOrder, setSortOrder] = useState(String(banner?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(banner?.isActive ?? true);
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(banner?.startsAt));
  const [expiresAt, setExpiresAt] = useState(
    toDatetimeLocal(banner?.expiresAt),
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input: BannerInput = {
      title: title.trim(),
      placement: placement as BannerInput["placement"],
      image: image.trim(),
      mobileImage: mobileImage.trim() || undefined,
      alt: alt.trim() || undefined,
      href: href.trim() || undefined,
      sortOrder: parseInt(sortOrder || "0", 10),
      isActive,
      startsAt: startsAt || undefined,
      expiresAt: expiresAt || undefined,
    };

    startTransition(async () => {
      const toastId = notify.loading(
        isEdit ? "Saving changes…" : "Creating banner…",
      );
      try {
        if (isEdit && banner) {
          await updateBanner(banner.id, input);
          notify.success(toastId, "Banner saved");
        } else {
          await createBanner(input, backHref); // redirects back to the list
        }
      } catch (err) {
        notify.error(
          toastId,
          "Save failed",
          err instanceof Error ? err.message : "Try again.",
        );
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="rounded-2xl border border-zinc-100 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">Basic info</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={labelCls}>Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Summer Sale 2026"
              required
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Placement</span>
            <select
              value={placement}
              onChange={(e) => setPlacement(e.target.value)}
              className={inputCls}
            >
              {BANNER_PLACEMENTS.map((p) => (
                <option key={p} value={p}>
                  {PLACEMENT_LABELS[p]}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-zinc-400">
              Long banner is shown on the homepage carousel.
            </span>
          </label>
          <label className="block">
            <span className={labelCls}>Sort order</span>
            <input
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className={inputCls}
            />
            <span className="mt-1 block text-xs text-zinc-400">
              Lower values appear first.
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-100 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">Images</h2>
        <div className="grid gap-4">
          <ImageField
            value={image}
            onChange={setImage}
            label="Desktop image"
            hint="Wide image (e.g. 2172×260) shown on desktop."
          />
          <ImageField
            value={mobileImage}
            onChange={setMobileImage}
            label="Mobile image"
            hint="Taller variant shown on small screens. Falls back to the desktop image when empty."
          />
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-100 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">
          Link & alt text
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Alt text</span>
            <input
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="e.g. Summer Sale"
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Link (optional)</span>
            <input
              value={href}
              onChange={(e) => setHref(e.target.value)}
              placeholder="e.g. /category/skin-care"
              className={inputCls}
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-100 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">Visibility</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Starts at</span>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Expires at</span>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className={inputCls}
            />
          </label>
        </div>
        <label className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 accent-point-500"
          />
          <span className="text-sm text-zinc-700">Active on storefront</span>
        </label>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded bg-point-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
        >
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create banner"}
        </button>
        <Link
          href={backHref}
          className="inline-flex h-10 items-center justify-center rounded border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </Link>
        <span className="text-sm text-zinc-400">
          {isEdit
            ? "Changes go live immediately."
            : "You'll be taken to the list after creating."}
        </span>
      </div>
    </form>
  );
}
