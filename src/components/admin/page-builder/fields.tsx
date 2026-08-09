"use client";

import { useState } from "react";
import { ImageField } from "@/components/admin/image-field";
import type { ProductSource, TripleBannerBox } from "@/lib/page-builder/types";

/**
 * Shared field primitives + the product-source and triple-banner editors used
 * by the page-builder section forms. All client components.
 */

export interface SectionFormOptions {
  brands: { slug: string; name: string }[];
  categories: { slug: string; name: string }[];
  products: { slug: string; name: string }[];
}

export const inputCls =
  "h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500";
export const labelCls = "mb-1 block text-xs font-medium text-zinc-500";

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
      {hint && <span className="mt-1 block text-xs text-zinc-400">{hint}</span>}
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min = 1,
  max = 50,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className={inputCls}
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// ── Product source ──────────────────────────────────────────────────────────

const SOURCE_KINDS: { value: ProductSource["kind"]; label: string }[] = [
  { value: "featured", label: "Featured products" },
  { value: "pre-order", label: "Pre-order products" },
  { value: "available-now", label: "Available now" },
  { value: "brand", label: "By brand" },
  { value: "category", label: "By category" },
  { value: "slugs", label: "Specific products" },
];

function defaultSource(
  kind: ProductSource["kind"],
  options: SectionFormOptions,
): ProductSource {
  switch (kind) {
    case "featured":
      return { kind, take: 4 };
    case "pre-order":
      return { kind, take: 20 };
    case "available-now":
      return { kind, take: 20 };
    case "brand":
      return { kind, slug: options.brands[0]?.slug ?? "", take: 20 };
    case "category":
      return { kind, slug: options.categories[0]?.slug ?? "", take: 20 };
    case "slugs":
      return { kind, slugs: [] };
  }
}

export function ProductSourceField({
  value,
  onChange,
  options,
}: {
  value: ProductSource;
  onChange: (s: ProductSource) => void;
  options: SectionFormOptions;
}) {
  return (
    <div className="space-y-3">
      <SelectField
        label="Product source"
        value={value.kind}
        onChange={(kind) =>
          onChange(defaultSource(kind as ProductSource["kind"], options))
        }
        options={SOURCE_KINDS.map((k) => ({ value: k.value, label: k.label }))}
      />

      {(value.kind === "featured" ||
        value.kind === "pre-order" ||
        value.kind === "available-now") && (
        <NumberField
          label="Number of products"
          value={value.take}
          onChange={(take) => onChange({ ...value, take })}
        />
      )}

      {value.kind === "brand" && (
        <SelectField
          label="Brand"
          value={value.slug}
          onChange={(slug) => onChange({ ...value, slug })}
          options={options.brands.map((b) => ({
            value: b.slug,
            label: b.name,
          }))}
        />
      )}

      {value.kind === "category" && (
        <SelectField
          label="Category"
          value={value.slug}
          onChange={(slug) => onChange({ ...value, slug })}
          options={options.categories.map((c) => ({
            value: c.slug,
            label: c.name,
          }))}
        />
      )}

      {value.kind === "slugs" && (
        <SlugsField
          value={value.slugs}
          onChange={(slugs) => onChange({ ...value, slugs })}
          options={options}
        />
      )}
    </div>
  );
}

/** Searchable checkbox list for picking specific products by slug. */
export function SlugsField({
  value,
  onChange,
  options,
}: {
  value: string[];
  onChange: (slugs: string[]) => void;
  options: SectionFormOptions;
}) {
  const [query, setQuery] = useState("");
  const selected = new Set(value);
  const filtered = options.products.filter((p) =>
    p.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function toggle(slug: string) {
    const next = new Set(selected);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    onChange([...next]);
  }

  return (
    <div>
      <span className={labelCls}>Products</span>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search products…"
        className={inputCls}
      />
      <div className="mt-1 max-h-48 overflow-y-auto rounded border border-zinc-200">
        {filtered.length === 0 ? (
          <p className="px-2 py-2 text-xs text-zinc-400">No products match.</p>
        ) : (
          filtered.map((p) => (
            <label
              key={p.slug}
              className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              <input
                type="checkbox"
                checked={selected.has(p.slug)}
                onChange={() => toggle(p.slug)}
                className="h-4 w-4 rounded border-zinc-300 accent-point-500"
              />
              <span className="truncate">{p.name}</span>
            </label>
          ))
        )}
      </div>
      <span className="mt-1 block text-xs text-zinc-400">
        {value.length} selected
      </span>
    </div>
  );
}

// ── Triple banner boxes ─────────────────────────────────────────────────────

export function TripleBannerBoxesField({
  value,
  onChange,
  options,
}: {
  value: TripleBannerBox[];
  onChange: (boxes: TripleBannerBox[]) => void;
  options: SectionFormOptions;
}) {
  const boxes = value ?? [];

  function updateBox(id: string, patch: Partial<TripleBannerBox>) {
    onChange(boxes.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }
  function addBox() {
    onChange([
      ...boxes,
      {
        id: crypto.randomUUID(),
        image: "",
        alt: "",
        title: "",
        sub: "",
        productSlugs: [],
      },
    ]);
  }
  function removeBox(id: string) {
    onChange(boxes.filter((b) => b.id !== id));
  }

  return (
    <div className="space-y-4">
      {boxes.map((box) => (
        <div key={box.id} className="rounded-lg border border-zinc-200 p-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700">
              {box.title || "Banner panel"}
            </span>
            <button
              type="button"
              onClick={() => removeBox(box.id)}
              className="text-xs font-medium text-red-500 hover:underline"
            >
              Remove
            </button>
          </div>
          <div className="grid gap-3">
            <ImageField
              value={box.image}
              onChange={(v) => updateBox(box.id, { image: v })}
              label="Image"
            />
            <TextField
              label="Title"
              value={box.title}
              onChange={(v) => updateBox(box.id, { title: v })}
            />
            <TextField
              label="Subtitle"
              value={box.sub}
              onChange={(v) => updateBox(box.id, { sub: v })}
            />
            <TextField
              label="Alt text"
              value={box.alt}
              onChange={(v) => updateBox(box.id, { alt: v })}
            />
            <SlugsField
              value={box.productSlugs}
              onChange={(v) => updateBox(box.id, { productSlugs: v })}
              options={options}
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addBox}
        className="inline-flex h-9 items-center justify-center rounded border border-dashed border-zinc-300 px-3 text-sm font-medium text-zinc-600 hover:border-point-500 hover:text-point-500"
      >
        + Add panel
      </button>
    </div>
  );
}
