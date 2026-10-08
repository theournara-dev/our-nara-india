"use client";

import Image from "next/image";
import Link from "next/link";
import {
  isFullScreenSize,
  isPopupContentLayout,
  isPopupTextAlign,
  popupImageHeight,
  popupOverlayOpacity,
  popupScale,
  popupWidthPx,
  type PopupContentLayout,
  type PopupTextAlign,
} from "@/lib/popups";

/** Everything the popup card renders, from either the DB or the admin preview. */
export interface PopupCardData {
  title?: string | null;
  body?: string | null;
  image?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  placement: string;
  size: string;
  widthPx?: number | null;
  scale?: number | null;
  /** "auto" (image above text) | "image" (image-only popup) | "text". */
  contentLayout?: string | null;
  /** Fixed media height in px; null = keep the image's own aspect ratio. */
  imageHeightPx?: number | null;
  textAlign?: string | null;
  /** Dim the page behind a centred popup. */
  overlay?: boolean;
  /** Overlay tint percent (0 = no dimming). */
  overlayOpacity?: number | null;
  closeOnOverlay?: boolean;
  /** Show the "Don't show again today" footer action. */
  hideToday?: boolean;
}

/**
 * The popup card: image, title, body, optional button, close button and the
 * "Don't show again today" footer. Shared by the storefront host and the admin
 * preview so an admin sees exactly what ships.
 *
 * Layout rules:
 *  - `contentLayout: "image"` makes an image-only popup — the artwork fills the
 *    card edge to edge and the text stays hidden.
 *  - `imageHeightPx` crops the image to that height (`object-cover`); unset
 *    keeps its own aspect ratio.
 *  - `size: "full"` fills whatever container the caller provides: the viewport
 *    on the storefront, the preview frame in the admin. Its text is centred
 *    over the artwork with a soft scrim for legibility.
 */
export function PopupCard({
  data,
  onClose,
  onHideToday,
  preview = false,
}: {
  data: PopupCardData;
  onClose: () => void;
  onHideToday?: () => void;
  /** Preview mode: nothing is clickable (the admin is only looking). */
  preview?: boolean;
}) {
  const full = isFullScreenSize(data.size);
  const layout: PopupContentLayout = isPopupContentLayout(data.contentLayout)
    ? data.contentLayout
    : "auto";
  const align: PopupTextAlign = isPopupTextAlign(data.textAlign)
    ? data.textAlign
    : "left";
  const width = popupWidthPx(data.size, data.widthPx);
  const scale = popupScale(data.scale);
  const mediaHeight = popupImageHeight(data.imageHeightPx);

  const showImage = Boolean(data.image) && layout !== "text";
  const hasText = Boolean(
    data.title || data.body || (data.ctaLabel && data.ctaHref),
  );
  const showText = hasText && layout !== "image";
  const centreText = full || align === "center";
  const overArtwork = full && showImage;

  const ctaClass =
    "mt-4 inline-flex h-10 items-center justify-center rounded bg-point-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-point-600";

  const text = showText ? (
    <div
      className={
        overArtwork
          ? "absolute inset-0 flex flex-col justify-center gap-1 p-8"
          : "p-6"
      }
    >
      <div className={centreText ? "text-center" : ""}>
        {data.title && (
          <h2
            className={`text-lg font-semibold ${
              overArtwork ? "text-white drop-shadow" : "text-zinc-900"
            }`}
          >
            {data.title}
          </h2>
        )}
        {data.body && (
          <p
            className={`mt-1 text-sm ${
              overArtwork ? "text-white/90 drop-shadow" : "text-zinc-600"
            }`}
          >
            {data.body}
          </p>
        )}
        {hasText && data.ctaLabel && data.ctaHref && (
          <div className={centreText ? "flex justify-center" : ""}>
            {preview ? (
              <span className={ctaClass}>{data.ctaLabel}</span>
            ) : (
              <Link href={data.ctaHref} onClick={onClose} className={ctaClass}>
                {data.ctaLabel}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div
      className={`relative flex flex-col overflow-hidden bg-white shadow-2xl ${
        full
          ? "h-full w-full"
          : // Never taller than the viewport: a tall image used to push the
            // close button and the footer off-screen with no way to scroll.
            "max-h-[calc(100dvh-2rem)] w-full rounded-2xl"
      }`}
      style={
        full
          ? undefined
          : {
              width,
              maxWidth: "100%",
              // Zoom without reflowing the layout, so a preset size stays the
              // anchor. A full-screen card ignores scale (it would overflow).
              transform: scale === 100 ? undefined : `scale(${scale / 100})`,
              transformOrigin:
                data.placement === "bottom" ? "bottom center" : "center",
            }
      }
    >
      {/* Scrolls when the content is taller than the capped card, keeping the
          close button and the footer in reach. */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {showImage &&
          (full ? (
            // Full screen: the artwork covers the card.
            <Image
              src={data.image!}
              alt={data.title ?? "Popup"}
              fill
              unoptimized
              sizes="100vw"
              className="object-cover"
            />
          ) : mediaHeight ? (
            // Fixed media height: crop the image to fill it.
            <div className="relative w-full" style={{ height: mediaHeight }}>
              <Image
                src={data.image!}
                alt={data.title ?? "Popup"}
                fill
                unoptimized
                sizes="720px"
                className="object-cover"
              />
            </div>
          ) : (
            <Image
              src={data.image!}
              alt={data.title ?? "Popup"}
              width={640}
              height={400}
              unoptimized
              className="h-auto w-full object-cover"
            />
          ))}

        {overArtwork && (
          // Soft scrim so centred text stays readable over any artwork.
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/20 to-black/25"
          />
        )}

        {text}
      </div>

      <button
        type="button"
        onClick={preview ? undefined : onClose}
        aria-label="Close popup"
        className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900/40 text-white hover:bg-zinc-900/60 ${
          preview ? "pointer-events-none" : ""
        }`}
      >
        ✕
      </button>

      {/* Footer: the classic "don't show again today" + close pair. */}
      {data.hideToday && (
        <div
          className={`flex items-stretch border-t text-xs ${
            full
              ? "absolute inset-x-0 bottom-0 border-white/20 bg-black/35 text-white backdrop-blur-sm"
              : "border-zinc-100"
          }`}
        >
          <button
            type="button"
            onClick={preview ? undefined : onHideToday}
            className={`flex-1 px-4 py-3 text-left hover:bg-zinc-500/10 ${
              full ? "text-white/80" : "text-zinc-500 hover:bg-zinc-50"
            } ${preview ? "pointer-events-none" : ""}`}
          >
            Don&apos;t show again today
          </button>
          <button
            type="button"
            onClick={preview ? undefined : onClose}
            className={`border-l px-5 py-3 font-semibold ${
              full
                ? "border-white/20 text-white hover:bg-zinc-500/10"
                : "border-zinc-100 text-zinc-700 hover:bg-zinc-50"
            } ${preview ? "pointer-events-none" : ""}`}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * The storefront surface: pins a centred modal (with its overlay), a bottom
 * banner, or a full-screen card over the page and hosts the card. Sits above
 * the site header (z-99) so a tall card is never covered at the top, and
 * carries `data-overlay` so the phone tab bar steps aside (see globals.css).
 */
export function PopupSurface({
  data,
  onClose,
  onHideToday,
}: {
  data: PopupCardData;
  onClose: () => void;
  onHideToday: () => void;
}) {
  if (isFullScreenSize(data.size)) {
    return (
      <div className="fixed inset-0 z-[100]" data-overlay>
        {data.overlay !== false && (
          <div
            className="absolute inset-0"
            style={{
              background: `rgba(24, 24, 27, ${popupOverlayOpacity(data.overlayOpacity) / 100})`,
            }}
            onClick={data.closeOnOverlay === false ? undefined : onClose}
            aria-hidden
          />
        )}
        <div className="absolute inset-0">
          <PopupCard data={data} onClose={onClose} onHideToday={onHideToday} />
        </div>
      </div>
    );
  }

  if (data.placement === "bottom") {
    return (
      <div className="fixed inset-x-0 bottom-0 z-[100] p-4" data-overlay>
        <div
          className="mx-auto w-full"
          style={{ maxWidth: popupWidthPx(data.size, data.widthPx) }}
        >
          <PopupCard data={data} onClose={onClose} onHideToday={onHideToday} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      data-overlay
    >
      {data.overlay !== false && (
        <div
          className="absolute inset-0"
          style={{
            background: `rgba(24, 24, 27, ${popupOverlayOpacity(data.overlayOpacity) / 100})`,
          }}
          onClick={data.closeOnOverlay === false ? undefined : onClose}
          aria-hidden
        />
      )}
      <div
        className="relative w-full"
        style={{ maxWidth: popupWidthPx(data.size, data.widthPx) }}
      >
        <PopupCard data={data} onClose={onClose} onHideToday={onHideToday} />
      </div>
    </div>
  );
}
