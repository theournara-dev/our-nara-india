"use client";

import type { ReactNode } from "react";
import { RichTextEditor } from "./rich-text-editor";
import { ImageUrlInput } from "./image-url-input";

type Config = Record<string, unknown>;

const inputCls =
  "h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500";
const labelCls = "mb-1 block text-xs font-medium text-zinc-500";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

function AlignSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    >
      <option value="left">Left</option>
      <option value="center">Center</option>
      <option value="right">Right</option>
    </select>
  );
}

/** Per-type editor for a block's `config`. */
export function BlockConfigForm({
  type,
  config,
  onChange,
}: {
  type: string;
  config: Config;
  onChange: (c: Config) => void;
}) {
  const set = (patch: Config) => onChange({ ...config, ...patch });
  const s = (k: string, fb = "") =>
    typeof config[k] === "string" ? (config[k] as string) : fb;
  const n = (k: string, fb = 0) =>
    typeof config[k] === "number" ? (config[k] as number) : fb;
  const bool = (k: string, fb = false) =>
    typeof config[k] === "boolean" ? (config[k] as boolean) : fb;

  switch (type) {
    case "rich-text":
      return (
        <div className="space-y-3">
          <RichTextEditor
            value={s("html")}
            onChange={(html) => set({ html })}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Align">
              <AlignSelect value={s("align", "left")} onChange={(v) => set({ align: v })} />
            </Field>
            <Field label="Font size">
              <select
                value={s("fontSize", "base")}
                onChange={(e) => set({ fontSize: e.target.value })}
                className={inputCls}
              >
                <option value="sm">Small</option>
                <option value="base">Normal</option>
                <option value="lg">Large</option>
                <option value="xl">Extra large</option>
                <option value="2xl">2× large</option>
              </select>
            </Field>
            <Field label="Max width (%)">
              <input
                type="number"
                min={20}
                max={100}
                value={n("maxWidth", 100)}
                onChange={(e) => set({ maxWidth: Number(e.target.value) })}
                className={inputCls}
              />
            </Field>
          </div>
        </div>
      );

    case "image":
      return (
        <div className="space-y-3">
          <ImageUrlInput value={s("src")} onChange={(src) => set({ src })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Alt text">
              <input value={s("alt")} onChange={(e) => set({ alt: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Link (optional)">
              <input value={s("href")} onChange={(e) => set({ href: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Width (%)">
              <input
                type="number"
                min={5}
                max={100}
                value={n("widthPct", 100)}
                onChange={(e) => set({ widthPct: Number(e.target.value) })}
                className={inputCls}
              />
            </Field>
            <Field label="Align">
              <AlignSelect value={s("align", "left")} onChange={(v) => set({ align: v })} />
            </Field>
            <Field label="Caption">
              <input value={s("caption")} onChange={(e) => set({ caption: e.target.value })} className={inputCls} />
            </Field>
            <label className="mt-5 flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={bool("rounded")}
                onChange={(e) => set({ rounded: e.target.checked })}
              />
              Rounded corners
            </label>
          </div>
        </div>
      );

    case "image-text":
      return (
        <div className="space-y-3">
          <ImageUrlInput value={s("src")} onChange={(src) => set({ src })} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Alt text">
              <input value={s("alt")} onChange={(e) => set({ alt: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Image side">
              <select
                value={s("imageSide", "left")}
                onChange={(e) => set({ imageSide: e.target.value })}
                className={inputCls}
              >
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </Field>
            <Field label="Image width (%)">
              <input
                type="number"
                min={20}
                max={80}
                value={n("imageWidthPct", 40)}
                onChange={(e) => set({ imageWidthPct: Number(e.target.value) })}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Text">
            <textarea
              value={s("text")}
              onChange={(e) => set({ text: e.target.value })}
              rows={4}
              className="w-full rounded border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-900 outline-none focus:border-point-500"
            />
          </Field>
        </div>
      );

    case "heading":
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <Field label="Text">
              <input value={s("text")} onChange={(e) => set({ text: e.target.value })} className={inputCls} />
            </Field>
          </div>
          <Field label="Level">
            <select
              value={s("level", "h2")}
              onChange={(e) => set({ level: e.target.value })}
              className={inputCls}
            >
              <option value="h2">H2 — Large</option>
              <option value="h3">H3 — Medium</option>
              <option value="h4">H4 — Small</option>
            </select>
          </Field>
          <Field label="Align">
            <AlignSelect value={s("align", "left")} onChange={(v) => set({ align: v })} />
          </Field>
        </div>
      );

    case "gallery": {
      const images = Array.isArray(config.images)
        ? (config.images as unknown[]).map((i) => (typeof i === "string" ? i : ""))
        : [];
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Columns">
              <input
                type="number"
                min={1}
                max={4}
                value={n("columns", 2)}
                onChange={(e) => set({ columns: Number(e.target.value) })}
                className={inputCls}
              />
            </Field>
            <Field label="Gap (px)">
              <input
                type="number"
                min={0}
                max={40}
                value={n("gap", 8)}
                onChange={(e) => set({ gap: Number(e.target.value) })}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="space-y-3">
            {images.map((img, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1">
                  <ImageUrlInput
                    label={`Image ${i + 1}`}
                    value={img}
                    onChange={(v) =>
                      set({ images: images.map((x, j) => (j === i ? v : x)) })
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => set({ images: images.filter((_, j) => j !== i) })}
                  className="mb-1 h-9 rounded border border-zinc-200 px-3 text-xs text-zinc-600 hover:bg-zinc-100"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => set({ images: [...images, ""] })}
              className="h-8 rounded border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
            >
              + Add image
            </button>
          </div>
        </div>
      );
    }

    case "video":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Video URL (YouTube / Vimeo)">
              <input
                value={s("url")}
                onChange={(e) => set({ url: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=…"
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Width (%)">
            <input
              type="number"
              min={20}
              max={100}
              value={n("widthPct", 100)}
              onChange={(e) => set({ widthPct: Number(e.target.value) })}
              className={inputCls}
            />
          </Field>
          <Field label="Align">
            <AlignSelect value={s("align", "left")} onChange={(v) => set({ align: v })} />
          </Field>
        </div>
      );

    case "button":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Label">
            <input value={s("label")} onChange={(e) => set({ label: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Link">
            <input value={s("href")} onChange={(e) => set({ href: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Style">
            <select
              value={s("variant", "solid")}
              onChange={(e) => set({ variant: e.target.value })}
              className={inputCls}
            >
              <option value="solid">Solid</option>
              <option value="outline">Outline</option>
            </select>
          </Field>
          <Field label="Align">
            <AlignSelect value={s("align", "left")} onChange={(v) => set({ align: v })} />
          </Field>
        </div>
      );

    case "divider":
      return (
        <Field label="Style">
          <select
            value={s("style", "solid")}
            onChange={(e) => set({ style: e.target.value })}
            className={inputCls}
          >
            <option value="solid">Solid</option>
            <option value="dashed">Dashed</option>
            <option value="dotted">Dotted</option>
          </select>
        </Field>
      );

    case "spacer":
      return (
        <Field label="Height (px)">
          <input
            type="number"
            min={4}
            max={200}
            value={n("height", 24)}
            onChange={(e) => set({ height: Number(e.target.value) })}
            className={inputCls}
          />
        </Field>
      );

    case "accordion": {
      const items = Array.isArray(config.items)
        ? (config.items as Record<string, unknown>[])
        : [];
      const upd = (i: number, patch: Record<string, string>) =>
        set({ items: items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
      return (
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="rounded border border-zinc-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500">
                  Item {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => set({ items: items.filter((_, j) => j !== i) })}
                  className="text-xs text-zinc-500 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
              <input
                value={typeof it.q === "string" ? it.q : ""}
                onChange={(e) => upd(i, { q: e.target.value })}
                placeholder="Question / title"
                className={`${inputCls} mb-2`}
              />
              <textarea
                value={typeof it.a === "string" ? it.a : ""}
                onChange={(e) => upd(i, { a: e.target.value })}
                placeholder="Answer / body"
                rows={3}
                className="w-full rounded border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-900 outline-none focus:border-point-500"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => set({ items: [...items, { q: "", a: "" }] })}
            className="h-8 rounded border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
          >
            + Add item
          </button>
        </div>
      );
    }

    default:
      return (
        <p className="text-sm text-zinc-400">
          No settings for this block type.
        </p>
      );
  }
}
