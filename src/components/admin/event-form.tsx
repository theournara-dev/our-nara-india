"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { notify } from "@/lib/toast";
import { toDatetimeLocal } from "@/lib/datetime";
import { ImageField } from "@/components/admin/image-field";
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
  href: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
};

/** Create/edit form for an /event card; images upload when the form is saved. */
export function EventForm(props: { event: EventModel | null; backHref: string }) {
  return (
    <UploadQueueProvider>
      <EventFormInner {...props} />
    </UploadQueueProvider>
  );
}

function EventFormInner({
  event,
  backHref,
}: {
  event: EventModel | null;
  backHref: string;
}) {
  const isEdit = Boolean(event);
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(event?.title ?? "");
  const [text, setText] = useState(event?.text ?? "");
  const [dateLabel, setDateLabel] = useState(event?.dateLabel ?? "");
  const [image, setImage] = useState(event?.image ?? "");
  const [href, setHref] = useState(event?.href ?? "");
  const [sortOrder, setSortOrder] = useState(String(event?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(event?.isActive ?? true);
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(event?.startsAt));
  const [expiresAt, setExpiresAt] = useState(toDatetimeLocal(event?.expiresAt));
  const gate = useUploadGate();

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
      href: href.trim() || undefined,
      sortOrder: parseInt(sortOrder || "0", 10),
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
      <section className="rounded-2xl border border-zinc-100 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">Card</h2>
        <div className="grid gap-4 sm:grid-cols-2">
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
            <span className={labelCls}>Link (optional)</span>
            <input
              value={href}
              onChange={(e) => setHref(e.target.value)}
              placeholder="e.g. /coupons"
              className={inputCls}
            />
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
        <div className="mt-4">
          <ImageField
            value={image}
            onChange={setImage}
            label="Card image (optional)"
            hint="Wide artwork; the title and text sit over its bottom-left corner. Without one the card renders as a plain panel."
          />
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
