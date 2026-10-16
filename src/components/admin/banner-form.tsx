"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { notify } from "@/lib/toast";
import { toDatetimeLocal } from "@/lib/datetime";
import { longBannerCellBox, longBannerPhoneBox } from "@/lib/long-banner";
import { BannerArtwork } from "@/components/banners/banner-artwork";
import { ImageField } from "@/components/admin/image-field";
import {
  UploadQueueProvider,
  useUploadGate,
} from "@/components/upload/upload-queue";
import {
  createBanner,
  updateBanner,
  type BannerInput,
} from "@/app/admin/banners/actions";

const inputCls =
  "h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500";
const labelCls = "mb-1 block text-xs font-medium text-zinc-500";

type BannerModel = {
  id: string;
  title: string;
  placement: string;
  categoryId: string | null;
  brandId: string | null;
  image: string;
  mobileImage: string | null;
  alt: string | null;
  href: string | null;
  style: string;
  heading: string | null;
  subheading: string | null;
  textAlign: string;
  textVAlign: string;
  textColor: string | null;
  scrim: boolean;
  sortOrder: number;
  isActive: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
};

type BannerFormProps = {
  banner: BannerModel | null;
  backHref: string;
  /**
   * The long banner's shape on the home page, so the previews below are the
   * boxes the storefront will really use.
   */
  longBanner: { columns: number; height: number };
};

/**
 * Where a banner can appear and at what box size. A banner is standalone media
 * (client's slide 3), so one artwork is shown in several components at several
 * sizes — the long-banner boxes come from the shared helpers so the two admin
 * previews (this form and the section form) always agree.
 */

/** Create/edit form for a banner; images upload when the form is saved. */
export function BannerForm(props: BannerFormProps) {
  return (
    <UploadQueueProvider>
      <BannerFormInner {...props} />
    </UploadQueueProvider>
  );
}

function BannerFormInner({ banner, backHref, longBanner }: BannerFormProps) {
  const isEdit = Boolean(banner);
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(banner?.title ?? "");
  const [image, setImage] = useState(banner?.image ?? "");
  const [mobileImage, setMobileImage] = useState(banner?.mobileImage ?? "");
  const [alt, setAlt] = useState(banner?.alt ?? "");
  const [href, setHref] = useState(banner?.href ?? "");
  const [style, setStyle] = useState(banner?.style ?? "image");
  const [heading, setHeading] = useState(banner?.heading ?? "");
  const [subheading, setSubheading] = useState(banner?.subheading ?? "");
  const [textAlign, setTextAlign] = useState(banner?.textAlign ?? "left");
  const [textVAlign, setTextVAlign] = useState(banner?.textVAlign ?? "bottom");
  const [textColor, setTextColor] = useState(banner?.textColor ?? "");
  const [scrim, setScrim] = useState(banner?.scrim ?? true);
  const [isActive, setIsActive] = useState(banner?.isActive ?? true);
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(banner?.startsAt));
  const [expiresAt, setExpiresAt] = useState(
    toDatetimeLocal(banner?.expiresAt),
  );
  const gate = useUploadGate();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Picked-but-unsaved images upload first, then the save re-runs (see
    // useUploadGate).
    void gate.save("banner");
  }

  function submitBanner() {
    // Placement, category, brand and sort order are deliberately absent: the
    // component showing the banner owns them.
    const input: BannerInput = {
      title: title.trim(),
      image: image.trim(),
      mobileImage: mobileImage.trim() || undefined,
      alt: alt.trim() || undefined,
      href: href.trim() || undefined,
      style: style as BannerInput["style"],
      heading: heading.trim() || undefined,
      subheading: subheading.trim() || undefined,
      textAlign: textAlign as BannerInput["textAlign"],
      textVAlign: textVAlign as BannerInput["textVAlign"],
      textColor: textColor.trim() || undefined,
      scrim,
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

  // Re-registered every render so the gate's second pass (after uploads) closes
  // over the state that now holds the uploaded URLs.
  useEffect(() => {
    gate.registerHandler("banner", submitBanner);
  });

  const preview = {
    image,
    mobileImage: mobileImage || null,
    alt,
    style,
    heading,
    subheading,
    textAlign,
    textVAlign,
    textColor: textColor || null,
    scrim,
  };

  // The long banner's frames follow the live section: same column count, same
  // height (0 = the strip's own proportions), so the shapes match the page.
  const autoHeight = longBanner.height <= 0;
  const longFrames = [1, 2, 3].map((columns) => ({
    columns,
    box: longBannerCellBox(columns, longBanner.height),
  }));
  const phone = longBannerPhoneBox(longBanner.height);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="rounded-2xl border border-zinc-100 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">Basic info</h2>
        <div className="grid gap-4">
          <label className="block">
            <span className={labelCls}>Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Summer Sale 2026"
              required
              className={inputCls}
            />
            <span className="mt-1 block text-xs text-zinc-400">
              An admin label — the pickers in the page builder list banners by
              it.
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
            hint="The artwork every component renders; its box decides the crop."
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
          Content inside the banner
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Type of content</span>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className={inputCls}
            >
              <option value="image">
                Image only — the artwork as uploaded
              </option>
              <option value="custom">Image with text — drawn over it</option>
            </select>
          </label>
          <label className="flex items-end gap-2 pb-1">
            <input
              type="checkbox"
              checked={scrim}
              onChange={(e) => setScrim(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 accent-point-500"
            />
            <span className="text-sm text-zinc-700">
              Dark scrim behind the text
            </span>
          </label>

          {style === "custom" && (
            <>
              <label className="block">
                <span className={labelCls}>Heading</span>
                <input
                  value={heading}
                  onChange={(e) => setHeading(e.target.value)}
                  placeholder="e.g. Summer Sale"
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Subheading</span>
                <input
                  value={subheading}
                  onChange={(e) => setSubheading(e.target.value)}
                  placeholder="e.g. Up to 40% off"
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Text placement — across</span>
                <select
                  value={textAlign}
                  onChange={(e) => setTextAlign(e.target.value)}
                  className={inputCls}
                >
                  <option value="left">Left</option>
                  <option value="center">Centre</option>
                  <option value="right">Right</option>
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Text placement — down</span>
                <select
                  value={textVAlign}
                  onChange={(e) => setTextVAlign(e.target.value)}
                  className={inputCls}
                >
                  <option value="top">Top</option>
                  <option value="middle">Middle</option>
                  <option value="bottom">Bottom</option>
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Text colour</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={textColor || "#ffffff"}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border border-zinc-200 bg-white"
                  />
                  <input
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    placeholder="#ffffff (default)"
                    className={inputCls}
                  />
                </div>
              </label>
            </>
          )}
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
            <span className="mt-1 block text-xs text-zinc-400">
              Where the banner goes when a component renders it as a link.
            </span>
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

      {/* One banner, the boxes different components put it in (client's slide
          3). The long-banner frames use the section's own settings, so what is
          shown here is what the strip really renders. */}
      <section className="rounded-2xl border border-zinc-100 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900">Preview</h2>
        <p className="mb-4 text-xs text-zinc-400">
          The same artwork in the boxes the storefront gives it. Long-banner
          frames follow{" "}
          <span className="text-zinc-500">Pages → Home → Long banner</span> —{" "}
          {longBanner.columns} column{longBanner.columns === 1 ? "" : "s"},
          height{" "}
          {autoHeight
            ? "automatic (each banner keeps the strip's proportions)"
            : `${longBanner.height}px`}
          . Sizes are quoted at the widest the page goes — the phone strip at a
          390px phone.
        </p>
        {!image ? (
          <p className="rounded border border-dashed border-zinc-200 py-8 text-center text-xs text-zinc-400">
            Add a desktop image to see the preview.
          </p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {longFrames.map((frame) => (
              <div key={frame.columns}>
                <p className="mb-1 text-xs text-zinc-500">
                  Long banner · {frame.columns} column
                  {frame.columns === 1 ? "" : "s"} · {frame.box.width} ×{" "}
                  {frame.box.height}
                  {autoHeight ? " (auto)" : ""}
                </p>
                <div className="flex w-full gap-[6px]">
                  {Array.from({ length: frame.columns }, (_, i) => (
                    <div
                      key={i}
                      className="relative min-w-0 flex-1 overflow-hidden rounded-lg bg-zinc-100"
                      style={{
                        aspectRatio: `${frame.box.width} / ${frame.box.height}`,
                      }}
                    >
                      <BannerArtwork banner={preview} />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <p className="mb-1 text-xs text-zinc-500">
                Long banner · phone · {phone.width} × {phone.height}
                {autoHeight ? " (auto)" : ""}
              </p>
              <div
                className="relative w-full max-w-[374px] overflow-hidden rounded-lg bg-zinc-100"
                style={{ aspectRatio: `${phone.width} / ${phone.height}` }}
              >
                <BannerArtwork
                  banner={{ ...preview, image: mobileImage || image }}
                />
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs text-zinc-500">
                Hero slide · portrait box — the artwork fills it, cropped
              </p>
              <div className="relative w-full max-w-[280px] overflow-hidden rounded-lg bg-zinc-100 [aspect-ratio:3/4]">
                <BannerArtwork banner={preview} />
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs text-zinc-500">
                Brand section / category page · one of a pair, at the
                artwork&apos;s own proportions
              </p>
              <div className="relative w-full max-w-[374px] overflow-hidden rounded-lg bg-zinc-100">
                <BannerArtwork banner={preview} fit="natural" />
              </div>
            </div>
          </div>
        )}
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
