"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { notify } from "@/lib/toast";
import { toDatetimeLocal } from "@/lib/datetime";
import { ImageField } from "@/components/admin/image-field";
import { PopupCard } from "@/components/popups/popup-card";
import {
  UploadQueueProvider,
  useUploadGate,
} from "@/components/upload/upload-queue";
import {
  createPopup,
  updatePopup,
  type PopupInput,
} from "@/app/admin/popups/actions";
import {
  POPUP_PLACEMENTS,
  PLACEMENT_LABELS,
  POPUP_FREQUENCIES,
  FREQUENCY_LABELS,
  FREQUENCY_HINTS,
  POPUP_SIZES,
  SIZE_LABELS,
  POPUP_CONTENT_LAYOUTS,
  CONTENT_LAYOUT_LABELS,
  CONTENT_LAYOUT_HINTS,
  POPUP_CONTENT_KINDS,
  CONTENT_KIND_LABELS,
  CONTENT_KIND_HINTS,
  POPUP_TEXT_ALIGNS,
  TEXT_ALIGN_LABELS,
  POPUP_LIMITS,
  DEFAULT_POPUP_WIDTH_PX,
  DEFAULT_POPUP_SCALE,
} from "@/app/admin/popups/lib";
import {
  isFullScreenSize,
  isPopupFrequency,
  isPopupContentKind,
} from "@/lib/popups";
import type { SwitcherContent } from "@/lib/site-content";

const inputCls =
  "h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500";
const labelCls = "mb-1 block text-xs font-medium text-zinc-500";
const hintCls = "mt-1 block text-xs text-zinc-400";

/** Parse a numeric input, clamping to the allowed range (empty → fallback). */
function numberValue(
  raw: string,
  fallback: number,
  min: number,
  max: number,
): number {
  if (raw.trim() === "") return fallback;
  const n = Number.parseInt(raw.replace(/[^\d]/g, ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

type PopupModel = {
  id: string;
  contentKind: string;
  title: string | null;
  body: string | null;
  image: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  placement: string;
  frequency: string;
  size: string;
  widthPx: number | null;
  scale: number;
  contentLayout: string;
  imageHeightPx: number | null;
  textAlign: string;
  delaySeconds: number;
  timeoutSeconds: number;
  overlay: boolean;
  overlayOpacity: number;
  closeOnOverlay: boolean;
  hideToday: boolean;
  isActive: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
};

type PopupFormProps = {
  popup: PopupModel | null;
  backHref: string;
  /** Store-picker content, rendered by the preview when the kind is picked. */
  switcher: SwitcherContent;
};

/** Create/edit form for a popup; its image uploads when the form is saved. */
export function PopupForm(props: PopupFormProps) {
  return (
    <UploadQueueProvider>
      <PopupFormInner {...props} />
    </UploadQueueProvider>
  );
}

function PopupFormInner({ popup, backHref, switcher }: PopupFormProps) {
  const isEdit = Boolean(popup);
  const [pending, startTransition] = useTransition();

  const [contentKind, setContentKind] = useState(
    popup?.contentKind ?? "custom",
  );
  // Store-picker popups render the store cards instead of the fields below.
  const storePicker = contentKind === "store-picker";
  const [title, setTitle] = useState(popup?.title ?? "");
  const [body, setBody] = useState(popup?.body ?? "");
  const [image, setImage] = useState(popup?.image ?? "");
  const [ctaLabel, setCtaLabel] = useState(popup?.ctaLabel ?? "");
  const [ctaHref, setCtaHref] = useState(popup?.ctaHref ?? "");
  const [placement, setPlacement] = useState(popup?.placement ?? "center");
  const [frequency, setFrequency] = useState(popup?.frequency ?? "once");
  const [size, setSize] = useState(popup?.size ?? "md");
  const [widthPx, setWidthPx] = useState(
    popup?.widthPx ?? DEFAULT_POPUP_WIDTH_PX,
  );
  const [scale, setScale] = useState(popup?.scale ?? DEFAULT_POPUP_SCALE);
  const [contentLayout, setContentLayout] = useState(
    popup?.contentLayout ?? "auto",
  );
  const [imageHeightPx, setImageHeightPx] = useState(popup?.imageHeightPx ?? 0);
  const [textAlign, setTextAlign] = useState(popup?.textAlign ?? "left");
  // Blob URL of a picked-but-unsaved image, so the preview updates on upload.
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  // Preview geometry: the frame the popup is drawn in and the card's own size,
  // measured so the preview can zoom a card that is larger than the panel.
  const previewFrameRef = useRef<HTMLDivElement>(null);
  const previewCardRef = useRef<HTMLDivElement>(null);
  const [previewBox, setPreviewBox] = useState({
    frameW: 0,
    frameH: 0,
    cardW: 0,
    cardH: 0,
  });
  const [delaySeconds, setDelaySeconds] = useState(popup?.delaySeconds ?? 0);
  const [timeoutSeconds, setTimeoutSeconds] = useState(
    popup?.timeoutSeconds ?? 0,
  );
  const [overlay, setOverlay] = useState(popup?.overlay ?? true);
  const [overlayOpacity, setOverlayOpacity] = useState(
    popup?.overlayOpacity ?? 50,
  );
  const [closeOnOverlay, setCloseOnOverlay] = useState(
    popup?.closeOnOverlay ?? true,
  );
  const [hideToday, setHideToday] = useState(popup?.hideToday ?? true);
  const [isActive, setIsActive] = useState(popup?.isActive ?? true);
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(popup?.startsAt));
  const [expiresAt, setExpiresAt] = useState(toDatetimeLocal(popup?.expiresAt));
  const gate = useUploadGate();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Picked-but-unsaved images upload first, then the save re-runs.
    void gate.save("popup");
  }

  function submitPopup() {
    const input: PopupInput = {
      contentKind: isPopupContentKind(contentKind) ? contentKind : "custom",
      title: title.trim() || undefined,
      body: body.trim() || undefined,
      image: image.trim() || undefined,
      ctaLabel: ctaLabel.trim() || undefined,
      ctaHref: ctaHref.trim() || undefined,
      placement: placement as PopupInput["placement"],
      frequency: frequency as PopupInput["frequency"],
      size: size as PopupInput["size"],
      widthPx: size === "custom" ? widthPx : undefined,
      scale,
      contentLayout: contentLayout as PopupInput["contentLayout"],
      imageHeightPx:
        imageHeightPx > 0
          ? Math.min(
              POPUP_LIMITS.imageHeightMax,
              Math.max(POPUP_LIMITS.imageHeightMin, imageHeightPx),
            )
          : undefined,
      textAlign: textAlign as PopupInput["textAlign"],
      delaySeconds,
      timeoutSeconds,
      overlay,
      overlayOpacity,
      closeOnOverlay,
      hideToday,
      isActive,
      startsAt: startsAt || undefined,
      expiresAt: expiresAt || undefined,
    };

    startTransition(async () => {
      const toastId = notify.loading(
        isEdit ? "Saving changes…" : "Creating popup…",
      );
      try {
        if (isEdit && popup) {
          await updatePopup(popup.id, input);
          notify.success(toastId, "Popup saved");
        } else {
          await createPopup(input, backHref); // redirects back to the list
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
    gate.registerHandler("popup", submitPopup);
  });

  // Track the frame and the card so a card too big for the panel is zoomed out
  // instead of being clipped (see `previewZoom`).
  useEffect(() => {
    const frame = previewFrameRef.current;
    const card = previewCardRef.current;
    if (!frame || !card) return;
    const observer = new ResizeObserver(() => {
      setPreviewBox({
        frameW: frame.clientWidth,
        frameH: frame.clientHeight,
        cardW: card.offsetWidth,
        cardH: card.offsetHeight,
      });
    });
    observer.observe(frame);
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  // How much the preview must shrink so the whole card — at its real width and
  // the configured scale — fits the panel. The storefront caps the card at its
  // viewport; the panel is much narrower than a real screen, so the preview
  // zooms the card instead of re-laying it out (a capped card would wrap its
  // text differently from the popup visitors see).
  const scaleFactor = scale / 100;
  const PREVIEW_PAD = 32;
  const previewZoom =
    previewBox.cardW > 0 && previewBox.frameW > 0
      ? Math.min(
          1,
          (previewBox.frameW - PREVIEW_PAD) / (previewBox.cardW * scaleFactor),
          (previewBox.frameH - PREVIEW_PAD) / (previewBox.cardH * scaleFactor),
        )
      : 1;
  const previewScale = scaleFactor * previewZoom;

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] xl:grid-cols-[minmax(0,1fr)_minmax(0,560px)]"
    >
      <div className="space-y-6">
        <section className="rounded-2xl border border-zinc-100 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">Content</h2>
          <div className="grid gap-4">
            <label className="block">
              <span className={labelCls}>Content type</span>
              <select
                value={contentKind}
                onChange={(e) => setContentKind(e.target.value)}
                className={inputCls}
              >
                {POPUP_CONTENT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {CONTENT_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
              <span className={hintCls}>
                {isPopupContentKind(contentKind)
                  ? CONTENT_KIND_HINTS[contentKind]
                  : CONTENT_KIND_HINTS.custom}
              </span>
            </label>
            {!storePicker && (
              <>
                <label className="block">
                  <span className={labelCls}>Title</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Flat 20% off this week"
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className={labelCls}>Body</span>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={3}
                    placeholder="Supporting text shown below the title."
                    className="w-full rounded border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-900 outline-none focus:border-point-500"
                  />
                </label>
                <ImageField
                  value={image}
                  onChange={setImage}
                  onPreviewChange={setImagePreview}
                  label="Image (optional)"
                  hint="Shown above the text, or as the whole popup with the Image only layout."
                />
              </>
            )}
          </div>
        </section>

        {!storePicker && (
          <section className="rounded-2xl border border-zinc-100 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-zinc-900">
              Button (optional)
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}>Button label</span>
                <input
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  placeholder="e.g. Shop now"
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Button link</span>
                <input
                  value={ctaHref}
                  onChange={(e) => setCtaHref(e.target.value)}
                  placeholder="e.g. /category/skin-care"
                  className={inputCls}
                />
              </label>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-zinc-100 bg-white p-5">
          <h2 className="mb-1 text-sm font-semibold text-zinc-900">Layout</h2>
          <p className={`${hintCls} mb-4`}>
            Width presets keep popups consistent, a custom width is capped at{" "}
            {POPUP_LIMITS.widthMax}px, and full screen fills the viewport.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Size</span>
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className={inputCls}
              >
                {POPUP_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {SIZE_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            {size === "custom" && (
              <label className="block">
                <span className={labelCls}>Width (px)</span>
                <input
                  inputMode="numeric"
                  value={String(widthPx)}
                  onChange={(e) =>
                    setWidthPx(
                      numberValue(
                        e.target.value,
                        DEFAULT_POPUP_WIDTH_PX,
                        POPUP_LIMITS.widthMin,
                        POPUP_LIMITS.widthMax,
                      ),
                    )
                  }
                  className={inputCls}
                />
              </label>
            )}
            {!isFullScreenSize(size) && (
              <label className="block">
                <span className={labelCls}>Scale (%)</span>
                <input
                  inputMode="numeric"
                  value={String(scale)}
                  onChange={(e) =>
                    setScale(
                      numberValue(
                        e.target.value,
                        DEFAULT_POPUP_SCALE,
                        POPUP_LIMITS.scaleMin,
                        POPUP_LIMITS.scaleMax,
                      ),
                    )
                  }
                  className={inputCls}
                />
                <span className={hintCls}>
                  Zooms the card without changing its layout width.
                </span>
              </label>
            )}
            {!storePicker && (
              <>
                <label className="block">
                  <span className={labelCls}>Content</span>
                  <select
                    value={contentLayout}
                    onChange={(e) => setContentLayout(e.target.value)}
                    className={inputCls}
                  >
                    {POPUP_CONTENT_LAYOUTS.map((l) => (
                      <option key={l} value={l}>
                        {CONTENT_LAYOUT_LABELS[l]}
                      </option>
                    ))}
                  </select>
                  <span className={hintCls}>
                    {
                      CONTENT_LAYOUT_HINTS[
                        contentLayout === "image" || contentLayout === "text"
                          ? contentLayout
                          : "auto"
                      ]
                    }
                  </span>
                </label>
                <label className="block">
                  <span className={labelCls}>Image height (px, 0 = auto)</span>
                  <input
                    inputMode="numeric"
                    value={String(imageHeightPx)}
                    onChange={(e) =>
                      setImageHeightPx(
                        numberValue(
                          e.target.value,
                          0,
                          0,
                          POPUP_LIMITS.imageHeightMax,
                        ),
                      )
                    }
                    disabled={contentLayout === "text"}
                    className={`${inputCls} disabled:bg-zinc-100 disabled:text-zinc-400`}
                  />
                  <span className={hintCls}>
                    A set height crops the image to fill it (full screen ignores
                    this).
                  </span>
                </label>
                <label className="block">
                  <span className={labelCls}>Text alignment</span>
                  <select
                    value={textAlign}
                    onChange={(e) => setTextAlign(e.target.value)}
                    disabled={contentLayout === "image"}
                    className={`${inputCls} disabled:bg-zinc-100 disabled:text-zinc-400`}
                  >
                    {POPUP_TEXT_ALIGNS.map((a) => (
                      <option key={a} value={a}>
                        {TEXT_ALIGN_LABELS[a]}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-100 bg-white p-5">
          <h2 className="mb-1 text-sm font-semibold text-zinc-900">Timing</h2>
          <p className={`${hintCls} mb-4`}>
            The delay applies to the first popup of a visit; when several popups
            are active they then follow one after another.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Delay before showing (seconds)</span>
              <input
                inputMode="numeric"
                value={String(delaySeconds)}
                onChange={(e) =>
                  setDelaySeconds(
                    numberValue(e.target.value, 0, 0, POPUP_LIMITS.delayMax),
                  )
                }
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Auto-close after (seconds)</span>
              <input
                inputMode="numeric"
                value={String(timeoutSeconds)}
                onChange={(e) =>
                  setTimeoutSeconds(
                    numberValue(e.target.value, 0, 0, POPUP_LIMITS.timeoutMax),
                  )
                }
                className={inputCls}
              />
              <span className={hintCls}>
                0 keeps the popup open until the visitor closes it.
              </span>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-100 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">Behavior</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Placement</span>
              <select
                value={placement}
                onChange={(e) => setPlacement(e.target.value)}
                className={inputCls}
              >
                {POPUP_PLACEMENTS.map((p) => (
                  <option key={p} value={p}>
                    {PLACEMENT_LABELS[p]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Frequency</span>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className={inputCls}
              >
                {POPUP_FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {FREQUENCY_LABELS[f]}
                  </option>
                ))}
              </select>
              <span className={hintCls}>
                {isPopupFrequency(frequency)
                  ? FREQUENCY_HINTS[frequency]
                  : FREQUENCY_HINTS.once}
              </span>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-100 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">
            Overlay &amp; closing
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                checked={overlay}
                onChange={(e) => setOverlay(e.target.checked)}
                className="h-4 w-4 accent-point-500"
              />
              <span className="text-sm text-zinc-700">
                Dim the page behind a centred popup
              </span>
            </label>
            <label className="block">
              <span className={labelCls}>Overlay tint (%)</span>
              <input
                inputMode="numeric"
                value={String(overlayOpacity)}
                onChange={(e) =>
                  setOverlayOpacity(
                    numberValue(
                      e.target.value,
                      50,
                      0,
                      POPUP_LIMITS.overlayOpacityMax,
                    ),
                  )
                }
                disabled={!overlay}
                className={`${inputCls} disabled:bg-zinc-100 disabled:text-zinc-400`}
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={closeOnOverlay}
                onChange={(e) => setCloseOnOverlay(e.target.checked)}
                className="h-4 w-4 accent-point-500"
              />
              <span className="text-sm text-zinc-700">
                Clicking the overlay closes it
              </span>
            </label>
            <label className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                checked={hideToday}
                onChange={(e) => setHideToday(e.target.checked)}
                className="h-4 w-4 accent-point-500"
              />
              <span className="text-sm text-zinc-700">
                Show the &quot;Don&apos;t show again today&quot; link
              </span>
            </label>
          </div>
          <p className={`${hintCls} mt-2`}>
            Escape always closes the popup, and the ✕ button stays available.
          </p>
        </section>

        <section className="rounded-2xl border border-zinc-100 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">
            Visibility
          </h2>
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
      </div>

      {/* Live preview — the same card the storefront renders. */}
      <section className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Preview
        </p>
        <div
          ref={previewFrameRef}
          className="relative h-[28rem] overflow-hidden rounded-xl border border-zinc-200 bg-gradient-to-b from-zinc-50 to-zinc-200"
        >
          <div className="absolute inset-x-0 top-0 flex items-center gap-3 border-b border-zinc-200/70 bg-white/70 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-zinc-300" />
            <span className="h-2 w-2 rounded-full bg-zinc-300" />
            <span className="text-[11px] text-zinc-500">
              Page behind the popup
            </span>
          </div>
          {placement === "center" && overlay && !isFullScreenSize(size) && (
            <div
              className="absolute inset-0"
              style={{
                background: `rgba(24, 24, 27, ${overlayOpacity / 100})`,
              }}
              aria-hidden
            />
          )}
          {isFullScreenSize(size) ? (
            // A full-screen popup is shown inside a viewport frame so the
            // proportions match the storefront without filling the admin page.
            <div className="absolute inset-0 p-3 pt-11">
              <div className="h-full w-full overflow-hidden rounded-lg border border-zinc-300 shadow-sm">
                <PopupCard
                  preview
                  switcher={switcher}
                  data={{
                    contentKind,
                    title,
                    body,
                    image: imagePreview ?? image,
                    ctaLabel,
                    ctaHref,
                    placement,
                    size,
                    widthPx,
                    scale,
                    contentLayout,
                    imageHeightPx: imageHeightPx > 0 ? imageHeightPx : null,
                    textAlign,
                    overlay,
                    overlayOpacity,
                    closeOnOverlay,
                    hideToday,
                  }}
                  onClose={() => {}}
                />
              </div>
            </div>
          ) : (
            <div
              className={`absolute inset-x-0 flex justify-center px-4 ${
                placement === "bottom" ? "bottom-4" : "top-1/2 -translate-y-1/2"
              }`}
            >
              {/* The box holds the *scaled* size so centring and the bottom
                  placement measure the card as it is actually drawn. */}
              <div
                style={
                  previewBox.cardW > 0
                    ? {
                        width: previewBox.cardW * previewScale,
                        height: previewBox.cardH * previewScale,
                      }
                    : undefined
                }
              >
                <div
                  ref={previewCardRef}
                  style={{
                    width: previewBox.cardW > 0 ? previewBox.cardW : undefined,
                    transform: `scale(${previewScale})`,
                    transformOrigin: "top left",
                  }}
                >
                  <PopupCard
                    preview
                    switcher={switcher}
                    data={{
                      contentKind,
                      title,
                      body,
                      image: imagePreview ?? image,
                      ctaLabel,
                      ctaHref,
                      placement,
                      size,
                      widthPx,
                      // The preview applies the scale itself (see previewScale).
                      scale: 100,
                      contentLayout,
                      imageHeightPx: imageHeightPx > 0 ? imageHeightPx : null,
                      textAlign,
                      overlay,
                      overlayOpacity,
                      closeOnOverlay,
                      hideToday,
                    }}
                    onClose={() => {}}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          {storePicker
            ? "The preview shows the same store cards as the header's store switcher. "
            : imagePreview
              ? "Showing the picked image — it uploads when you save. "
              : ""}
          {!isFullScreenSize(size) &&
          previewBox.cardW > 0 &&
          previewZoom < 0.999
            ? `Zoomed to ${Math.round(previewScale * 100)}% to fit the panel — the popup renders ${Math.round(
                previewBox.cardW * scaleFactor,
              )}px wide on the storefront.`
            : isFullScreenSize(size)
              ? "A full-screen popup fills the frame above; scale does not apply to it."
              : "Drawn at the size the storefront renders it."}
        </p>
      </section>

      <div className="flex flex-wrap items-center gap-3 lg:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded bg-point-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
        >
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create popup"}
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
