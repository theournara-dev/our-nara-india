"use client";

import Image from "next/image";
import Link from "next/link";
import { popupOverlayOpacity, popupScale, popupWidthPx } from "@/lib/popups";

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
 * Positioning (fixed modal/banner, or sitting inside a preview frame) is the
 * caller's job; the card only owns its own size and scale.
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
  const width = popupWidthPx(data.size, data.widthPx);
  const scale = popupScale(data.scale);
  const hasLink = Boolean(data.ctaLabel && data.ctaHref);

  const ctaClass =
    "mt-4 inline-flex h-10 items-center justify-center rounded bg-point-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-point-600";

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl bg-white shadow-2xl"
      style={{
        width,
        maxWidth: "100%",
        // Zoom without reflowing the layout, so a preset size stays the anchor.
        transform: scale === 100 ? undefined : `scale(${scale / 100})`,
        transformOrigin:
          data.placement === "bottom" ? "bottom center" : "center",
      }}
    >
      {data.image && (
        <Image
          src={data.image}
          alt={data.title ?? "Popup"}
          width={640}
          height={400}
          unoptimized
          className="h-auto w-full object-cover"
        />
      )}
      {(data.title || data.body || hasLink) && (
        <div className="p-6">
          {data.title && (
            <h2 className="text-lg font-semibold text-zinc-900">
              {data.title}
            </h2>
          )}
          {data.body && (
            <p className="mt-1 text-sm text-zinc-600">{data.body}</p>
          )}
          {hasLink &&
            (preview ? (
              <span className={ctaClass}>{data.ctaLabel}</span>
            ) : (
              <Link href={data.ctaHref!} onClick={onClose} className={ctaClass}>
                {data.ctaLabel}
              </Link>
            ))}
        </div>
      )}

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
        <div className="flex items-stretch border-t border-zinc-100 text-xs">
          <button
            type="button"
            onClick={preview ? undefined : onHideToday}
            className={`flex-1 px-4 py-3 text-left text-zinc-500 hover:bg-zinc-50 ${
              preview ? "pointer-events-none" : ""
            }`}
          >
            Don&apos;t show again today
          </button>
          <button
            type="button"
            onClick={preview ? undefined : onClose}
            className={`border-l border-zinc-100 px-5 py-3 font-semibold text-zinc-700 hover:bg-zinc-50 ${
              preview ? "pointer-events-none" : ""
            }`}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * The storefront surface: pins a centred modal (with its overlay) or a bottom
 * banner over the page and hosts the card.
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
  if (data.placement === "bottom") {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 p-4">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
