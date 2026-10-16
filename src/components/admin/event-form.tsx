"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { notify } from "@/lib/toast";
import { toDatetimeLocal } from "@/lib/datetime";
import { eventBackground, type EventBackground } from "@/lib/event-background";
import { ImageField } from "@/components/admin/image-field";
import { EventBackgroundEditor } from "@/components/admin/event-background-editor";
import {
  LinkField,
  type LinkFieldOptions,
} from "@/components/admin/link-field";
import { EventCardView } from "@/components/events/event-card";
import {
  UploadQueueProvider,
  useUploadGate,
} from "@/components/upload/upload-queue";
import {
  createEvent,
  updateEvent,
  type EventInput,
} from "@/app/admin/events/actions";

const inputCls =
  "h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500";
const labelCls = "mb-1 block text-xs font-medium text-zinc-500";

type EventModel = {
  id: string;
  title: string;
  text: string | null;
  dateLabel: string | null;
  image: string | null;
  color: string | null;
  href: string | null;
  imageFocusX: number;
  imageFocusY: number;
  imageZoom: number;
  isActive: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
};

/** The brand purple, matching the storefront card's fallback. */
const DEFAULT_COLOR = "#6f2dbd";

/**
 * Create/edit form for an /event card, with a live preview of the exact block
 * the storefront renders; images upload when the form is saved.
 *
 * The preview is the card itself at the size /event's grid gives it, with the
 * background framing tools attached (client's slide 6), so an editor frames the
 * artwork while looking at what visitors get.
 */
export function EventForm({
  event,
  backHref,
  options,
}: {
  event: EventModel | null;
  backHref: string;
  options: LinkFieldOptions;
}) {
  return (
    <UploadQueueProvider>
      <EventFormInner event={event} backHref={backHref} options={options} />
    </UploadQueueProvider>
  );
}

function EventFormInner({
  event,
  backHref,
  options,
}: {
  event: EventModel | null;
  backHref: string;
  options: LinkFieldOptions;
}) {
  const isEdit = Boolean(event);
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(event?.title ?? "");
  const [text, setText] = useState(event?.text ?? "");
  const [dateLabel, setDateLabel] = useState(event?.dateLabel ?? "");
  const [image, setImage] = useState(event?.image ?? "");
  // A picked-but-unsaved file, so the card previews it before the upload lands.
  const [pickedImage, setPickedImage] = useState<string | null>(null);
  const [framing, setFraming] = useState<EventBackground>(() =>
    eventBackground({
      focusX: event?.imageFocusX,
      focusY: event?.imageFocusY,
      zoom: event?.imageZoom,
    }),
  );
  const [color, setColor] = useState(event?.color ?? DEFAULT_COLOR);
  const [href, setHref] = useState(event?.href ?? "");
  const [isActive, setIsActive] = useState(event?.isActive ?? true);
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(event?.startsAt));
  const [expiresAt, setExpiresAt] = useState(toDatetimeLocal(event?.expiresAt));
  const gate = useUploadGate();

  /** What the card shows: the uploaded URL, or the file still waiting to upload. */
  const previewImage = pickedImage ?? (image.trim() || null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Picked-but-unsaved images upload first, then the save re-runs (see
    // useUploadGate).
    void gate.save("event");
  }

  function submitEvent() {
    const input: EventInput = {
      title: title.trim(),
      text: text.trim() || undefined,
      dateLabel: dateLabel.trim() || undefined,
      image: image.trim() || undefined,
      imageFocusX: framing.focusX,
      imageFocusY: framing.focusY,
      imageZoom: framing.zoom,
      color: color.trim() || undefined,
      href: href.trim() || undefined,
      isActive,
      startsAt: startsAt || undefined,
      expiresAt: expiresAt || undefined,
    };

    startTransition(async () => {
      const toastId = notify.loading(
        isEdit ? "Saving changes…" : "Creating event…",
      );
      try {
        if (isEdit && event) {
          const res = await updateEvent(event.id, input);
          if (!res.ok) {
            notify.error(toastId, "Save failed", res.message);
            return;
          }
          notify.success(toastId, "Event saved");
        } else {
          await createEvent(input, backHref); // redirects back to the list
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
    gate.registerHandler("event", submitEvent);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-2xl border border-zinc-100 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-zinc-900">Card</h2>
            <div className="grid gap-4 [&>*]:min-w-0 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className={labelCls}>Title</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Welcome Gift — +3,000P"
                  required
                  className={inputCls}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelCls}>Text</span>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  maxLength={600}
                  placeholder="One or two lines shown under the title."
                  className="w-full rounded border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-900 outline-none focus:border-point-500"
                />
              </label>
              <label className="block">
                <span className={labelCls}>Date label (optional)</span>
                <input
                  value={dateLabel}
                  onChange={(e) => setDateLabel(e.target.value)}
                  placeholder="e.g. Ongoing or Dec 1 – 31"
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>
                  Card colour (when there is no image)
                </span>
                <span className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    aria-label="Card colour"
                    className="h-9 w-12 shrink-0 cursor-pointer rounded border border-zinc-200 bg-white p-1"
                  />
                  <input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className={inputCls}
                  />
                </span>
              </label>
              <div className="sm:col-span-2">
                <LinkField
                  label="Link (optional)"
                  value={href}
                  onChange={setHref}
                  options={options}
                  hint="Where the card goes when clicked."
                />
              </div>
            </div>
            <div className="mt-4">
              <ImageField
                value={image}
                onChange={setImage}
                onPreviewChange={setPickedImage}
                label="Background image"
                hint="Covers the whole card (cropped to fill it). Any size works; frame it in the preview on the right."
              />
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-100 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-zinc-900">
              Visibility
            </h2>
            <div className="grid gap-4 [&>*]:min-w-0 sm:grid-cols-2">
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
              <span className="text-sm text-zinc-700">
                Active on storefront
              </span>
            </label>
            <p className="mt-3 text-xs text-zinc-400">
              The order on /event is set from the list&apos;s arrows.
            </p>
          </section>
        </div>

        {/* The card exactly as /event renders it, with the framing tools on it. */}
        <div className="min-w-0 lg:sticky lg:top-6">
          <p className={labelCls}>Preview</p>
          <EventBackgroundEditor
            value={framing}
            onChange={(next) => setFraming((f) => ({ ...f, ...next }))}
            disabled={!previewImage}
          >
            <EventCardView
              event={{
                title,
                text,
                dateLabel,
                image: previewImage,
                color,
                href: href || null,
                imageFocusX: framing.focusX,
                imageFocusY: framing.focusY,
                imageZoom: framing.zoom,
              }}
            />
          </EventBackgroundEditor>
          <p className="mt-2 text-xs text-zinc-400">
            The /event card at the width its grid gives it (600px), scaled to
            fit this panel — the page&apos;s own corner, type and crop. Phones
            show one card per row.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded bg-point-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
        >
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create event"}
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
