"use client";

import { useState, useTransition } from "react";
import { ImageField } from "@/components/admin/image-field";
import {
  StorePickerCards,
  STORE_PICKER_PANEL_CLASS,
} from "@/components/layout/store-picker-cards";
import { saveSiteContent, saveStorePicker } from "@/app/admin/site/actions";
import { notify } from "@/lib/toast";
import type {
  SiteContent,
  SwitcherBlock,
  SwitcherContent,
  TopBannerBlock,
} from "@/lib/site-content";
import type { SiteVersion } from "@/lib/site-version";

const inputCls =
  "h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500";
const labelCls = "mb-1 block text-xs font-medium text-zinc-500";
const saveBtnCls =
  "h-9 rounded bg-point-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60";

const VERSIONS: { key: SiteVersion; label: string; hint: string }[] = [
  {
    key: "local",
    label: "India (our-nara.com)",
    hint: "Shown to visitors shopping the India store.",
  },
  {
    key: "global",
    label: "International (our-nara.co.kr)",
    hint: "Shown to visitors shopping the international store.",
  },
];

/** Random-enough id for a freshly added block. */
function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Admin editor for the storefront's per-version content: contact details, the
 * rotating top banner and the store-picker popup. Each panel saves on its own
 * so a half-finished edit can't overwrite the rest.
 */
export function SiteSettingsForm({
  initial,
  initialSwitcher,
}: {
  initial: Record<SiteVersion, SiteContent>;
  initialSwitcher: SwitcherContent;
}) {
  const [tab, setTab] = useState<SiteVersion>("local");
  const [content, setContent] = useState(initial);
  const [switcher, setSwitcher] = useState(initialSwitcher);
  const [saving, setSaving] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const current = content[tab];

  function patch(patchValue: Partial<SiteContent>) {
    setContent((prev) => ({ ...prev, [tab]: { ...prev[tab], ...patchValue } }));
  }

  function run(label: string, action: () => Promise<void>) {
    setSaving(label);
    startTransition(async () => {
      const toastId = notify.loading("Saving…");
      try {
        await action();
        notify.success(toastId, "Saved");
      } catch (err) {
        notify.error(
          toastId,
          "Save failed",
          err instanceof Error ? err.message : "Try again.",
        );
      } finally {
        setSaving(null);
      }
    });
  }

  // The contact and banner panels share one row-level save action, so both send
  // the full current state of the store (never a stale half).
  const saveStore = (label: string) =>
    run(label, () =>
      saveSiteContent({
        version: tab,
        email: current.email,
        phone: current.phone,
        address: current.address,
        topBanner: current.topBanner,
      }),
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900">
          Site settings
        </h1>
        <p className="text-sm text-zinc-500">
          Storefront content for each store. Everything here appears on the live
          site immediately after saving.
        </p>
      </div>

      {/* Store tabs */}
      <div className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 p-1">
        {VERSIONS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === key
                ? "bg-white text-point-600 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="-mt-4 text-xs text-zinc-400">
        {VERSIONS.find((v) => v.key === tab)?.hint}
      </p>

      {/* ── Contact details ─────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-zinc-100 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-zinc-900">
          Contact details
        </h2>
        <p className="mb-4 text-xs text-zinc-400">
          Shown in the footer, the policies and the order emails. The email is
          also the inbox that receives the store&apos;s new-order notifications.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Email</span>
            <input
              type="email"
              value={current.email}
              onChange={(e) => patch({ email: e.target.value })}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Phone</span>
            <input
              value={current.phone}
              onChange={(e) => patch({ phone: e.target.value })}
              placeholder="Leave empty to hide the phone"
              className={inputCls}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>Address</span>
            <textarea
              rows={2}
              value={current.address}
              onChange={(e) => patch({ address: e.target.value })}
              className="w-full rounded border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-900 outline-none focus:border-point-500"
            />
          </label>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => saveStore("contact")}
            disabled={saving !== null}
            className={saveBtnCls}
          >
            {saving === "contact" ? "Saving…" : "Save contact details"}
          </button>
        </div>
      </section>

      {/* ── Top banner ──────────────────────────────────────────────────── */}
      <TopBannerEditor
        blocks={current.topBanner}
        onChange={(topBanner) => patch({ topBanner })}
        onSave={() => saveStore("banner")}
        saving={saving === "banner"}
        disabled={saving !== null}
      />

      {/* ── Store picker ────────────────────────────────────────────────── */}
      <StorePickerEditor
        content={switcher}
        onChange={setSwitcher}
        onSave={() => run("switcher", () => saveStorePicker(switcher))}
        saving={saving === "switcher"}
        disabled={saving !== null}
      />
    </div>
  );
}

/** Editor + live preview for the strips pinned above the header. */
function TopBannerEditor({
  blocks,
  onChange,
  onSave,
  saving,
  disabled,
}: {
  blocks: TopBannerBlock[];
  onChange: (blocks: TopBannerBlock[]) => void;
  onSave: () => void;
  saving: boolean;
  disabled: boolean;
}) {
  function update(index: number, next: TopBannerBlock) {
    onChange(blocks.map((b, i) => (i === index ? next : b)));
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function add() {
    onChange([
      ...blocks,
      {
        id: newId("b"),
        kind: "text",
        text: "",
        background: "#18181b",
        textColor: "#ffffff",
      },
    ]);
  }

  return (
    <section className="rounded-2xl border border-zinc-100 bg-white p-5">
      <div className="mb-1 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Top banner</h2>
          <p className="mt-1 text-xs text-zinc-400">
            The strip above the header. It rotates through these blocks every
            2.5s; visitors can close it. Each block is text or an image with its
            own coloured background.
          </p>
        </div>
        <button
          type="button"
          onClick={add}
          className="h-8 shrink-0 rounded border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
        >
          + Add block
        </button>
      </div>

      {blocks.length === 0 && (
        <p className="mt-3 text-sm text-zinc-500">
          No blocks — the banner is hidden.
        </p>
      )}

      <div className="mt-3 space-y-3">
        {blocks.map((block, i) => (
          <div
            key={block.id}
            className="space-y-3 rounded-lg border border-zinc-100 bg-zinc-50/60 p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label={`Block ${i + 1} type`}
                value={block.kind}
                onChange={(e) =>
                  update(
                    i,
                    e.target.value === "image"
                      ? {
                          id: block.id,
                          kind: "image",
                          image: "",
                          background: block.background,
                        }
                      : {
                          id: block.id,
                          kind: "text",
                          text: "",
                          background: block.background,
                          textColor: "#ffffff",
                        },
                  )
                }
                className={`${inputCls} w-auto`}
              >
                <option value="text">Text</option>
                <option value="image">Image</option>
              </select>
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Move block up"
                className="h-8 rounded px-2 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === blocks.length - 1}
                aria-label="Move block down"
                className="h-8 rounded px-2 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange(blocks.filter((_, index) => index !== i))
                }
                className="h-8 rounded px-2 text-xs text-rose-600 hover:bg-rose-50"
              >
                Remove
              </button>
            </div>

            {block.kind === "text" ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block">
                  <span className={labelCls}>Text</span>
                  <input
                    value={block.text}
                    onChange={(e) =>
                      update(i, { ...block, text: e.target.value })
                    }
                    className={inputCls}
                  />
                </label>
                <ColorInput
                  label="Background"
                  value={block.background}
                  onChange={(background) => update(i, { ...block, background })}
                />
                <ColorInput
                  label="Text colour"
                  value={block.textColor}
                  onChange={(textColor) => update(i, { ...block, textColor })}
                />
                <label className="block">
                  <span className={labelCls}>Link (optional)</span>
                  <input
                    value={block.href ?? ""}
                    onChange={(e) =>
                      update(i, { ...block, href: e.target.value || undefined })
                    }
                    placeholder="/category/skin-care"
                    className={inputCls}
                  />
                </label>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <ImageField
                    label="Image"
                    value={block.image}
                    onChange={(image) => update(i, { ...block, image })}
                    hint="Shown at the strip's height, centered."
                  />
                </div>
                <ColorInput
                  label="Background"
                  value={block.background}
                  onChange={(background) => update(i, { ...block, background })}
                />
                <label className="block">
                  <span className={labelCls}>Link (optional)</span>
                  <input
                    value={block.href ?? ""}
                    onChange={(e) =>
                      update(i, { ...block, href: e.target.value || undefined })
                    }
                    placeholder="/category/skin-care"
                    className={inputCls}
                  />
                </label>
              </div>
            )}
          </div>
        ))}
      </div>

      {blocks.length > 0 && (
        <div className="mt-4">
          <span className={labelCls}>Preview</span>
          <div className="overflow-hidden rounded-lg border border-zinc-200">
            {blocks.map((block) => (
              <div
                key={block.id}
                className="flex h-[34px] items-center justify-center text-center text-xs font-medium"
                style={{
                  backgroundColor: block.background,
                  color: block.kind === "text" ? block.textColor : "#ffffff",
                }}
              >
                {block.kind === "text" ? (
                  <span>{block.text || "(empty)"}</span>
                ) : block.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={block.image}
                    alt=""
                    className="h-[34px] w-auto object-contain"
                  />
                ) : (
                  <span>(no image yet)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={onSave}
          disabled={disabled}
          className={saveBtnCls}
        >
          {saving ? "Saving…" : "Save top banner"}
        </button>
      </div>
    </section>
  );
}

/** Editor + live preview for the store-picker popup (shared by both stores). */
function StorePickerEditor({
  content,
  onChange,
  onSave,
  saving,
  disabled,
}: {
  content: SwitcherContent;
  onChange: (c: SwitcherContent) => void;
  onSave: () => void;
  saving: boolean;
  disabled: boolean;
}) {
  function updateBlock(index: number, patchBlock: Partial<SwitcherBlock>) {
    onChange({
      ...content,
      blocks: content.blocks.map((b, i) =>
        i === index ? { ...b, ...patchBlock } : b,
      ),
    });
  }

  return (
    <section className="rounded-2xl border border-zinc-100 bg-white p-5">
      <h2 className="mb-1 text-sm font-semibold text-zinc-900">Store picker</h2>
      <p className="mb-4 text-xs text-zinc-400">
        The popup shown when a visitor opens the store switcher. It describes
        both stores, so this one editor applies to both sites.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Title</span>
          <input
            value={content.title}
            onChange={(e) => onChange({ ...content, title: e.target.value })}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>Subtitle (optional)</span>
          <input
            value={content.subtitle ?? ""}
            onChange={(e) =>
              onChange({ ...content, subtitle: e.target.value || undefined })
            }
            className={inputCls}
          />
        </label>
      </div>

      <div className="mt-4 space-y-3">
        {content.blocks.map((block, i) => (
          <div
            key={block.id}
            className="space-y-3 rounded-lg border border-zinc-100 bg-zinc-50/60 p-3"
          >
            <div className="flex items-center gap-2">
              <span className="rounded bg-white px-2 py-0.5 text-xs font-semibold text-zinc-600">
                {block.store === "local" ? "India card" : "International card"}
              </span>
              <span className="text-xs text-zinc-400">
                switches the visitor to the{" "}
                {block.store === "local" ? "India" : "international"} store
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}>Title</span>
                <input
                  value={block.title}
                  onChange={(e) => updateBlock(i, { title: e.target.value })}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Description</span>
                <input
                  value={block.description}
                  onChange={(e) =>
                    updateBlock(i, { description: e.target.value })
                  }
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Currency</span>
                <input
                  value={block.currency}
                  onChange={(e) => updateBlock(i, { currency: e.target.value })}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Badge (optional)</span>
                <input
                  value={block.badge ?? ""}
                  onChange={(e) =>
                    updateBlock(i, { badge: e.target.value || undefined })
                  }
                  placeholder="Recommended"
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Button label</span>
                <input
                  value={block.ctaLabel}
                  onChange={(e) => updateBlock(i, { ctaLabel: e.target.value })}
                  className={inputCls}
                />
              </label>
              <ColorInput
                label="Accent colour"
                value={block.accent}
                onChange={(accent) => updateBlock(i, { accent })}
              />
            </div>
            <ImageField
              label="Card image (optional)"
              value={block.image ?? ""}
              onChange={(image) =>
                updateBlock(i, { image: image || undefined })
              }
              hint="Wide banner image shown at the top of the card."
            />
          </div>
        ))}
      </div>

      <div className="mt-4">
        <span className={labelCls}>Preview</span>
        {/* Same panel class as the storefront dropdown, so the preview is the
            exact size of the real thing. */}
        <div className={`${STORE_PICKER_PANEL_CLASS} bg-zinc-50`}>
          <div className="mb-3 px-1 text-center">
            <p className="text-sm font-semibold text-ink">{content.title}</p>
            {content.subtitle && (
              <p className="mt-0.5 text-xs text-[#888]">{content.subtitle}</p>
            )}
          </div>
          <StorePickerCards content={content} activeStore="local" />
        </div>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={onSave}
          disabled={disabled}
          className={saveBtnCls}
        >
          {saving ? "Saving…" : "Save store picker"}
        </button>
      </div>
    </section>
  );
}

/** Colour swatch + hex input pair, matching the variant editor's control. */
function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} swatch`}
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 shrink-0 cursor-pointer rounded border border-zinc-200 bg-white p-1"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#18181b"
          className={`${inputCls} w-28`}
        />
      </span>
    </label>
  );
}
