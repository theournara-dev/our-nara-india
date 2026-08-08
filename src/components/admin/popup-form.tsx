"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { notify } from "@/lib/toast";
import { toDatetimeLocal } from "@/lib/datetime";
import { ImageField } from "@/components/admin/image-field";
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
} from "@/app/admin/popups/lib";

const inputCls =
  "h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500";
const labelCls = "mb-1 block text-xs font-medium text-zinc-500";

type PopupModel = {
  id: string;
  title: string | null;
  body: string | null;
  image: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  placement: string;
  frequency: string;
  isActive: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
};

export function PopupForm({
  popup,
  backHref,
}: {
  popup: PopupModel | null;
  backHref: string;
}) {
  const isEdit = Boolean(popup);
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(popup?.title ?? "");
  const [body, setBody] = useState(popup?.body ?? "");
  const [image, setImage] = useState(popup?.image ?? "");
  const [ctaLabel, setCtaLabel] = useState(popup?.ctaLabel ?? "");
  const [ctaHref, setCtaHref] = useState(popup?.ctaHref ?? "");
  const [placement, setPlacement] = useState(popup?.placement ?? "center");
  const [frequency, setFrequency] = useState(popup?.frequency ?? "once");
  const [isActive, setIsActive] = useState(popup?.isActive ?? true);
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(popup?.startsAt));
  const [expiresAt, setExpiresAt] = useState(toDatetimeLocal(popup?.expiresAt));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input: PopupInput = {
      title: title.trim() || undefined,
      body: body.trim() || undefined,
      image: image.trim() || undefined,
      ctaLabel: ctaLabel.trim() || undefined,
      ctaHref: ctaHref.trim() || undefined,
      placement: placement as PopupInput["placement"],
      frequency: frequency as PopupInput["frequency"],
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

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="rounded-2xl border border-zinc-100 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">Content</h2>
        <div className="grid gap-4">
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
            label="Image (optional)"
            hint="A visual shown above the text. Optional."
          />
        </div>
      </section>

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
            <span className="mt-1 block text-xs text-zinc-400">
              &quot;Once per session&quot; shows once per browser session;
              &quot;Every visit&quot; shows on every page load.
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

      <div className="flex flex-wrap items-center gap-3">
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
