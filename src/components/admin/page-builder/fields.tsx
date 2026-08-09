"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import { ImageField } from "@/components/admin/image-field";
import type {
  HeroSlide,
  ProductSource,
  TripleBannerBox,
} from "@/lib/page-builder/types";

/**
 * Shared field primitives + the product-source and triple-banner editors used
 * by the page-builder section forms. All client components.
 */

export interface SectionFormOptions {
  brands: { slug: string; name: string }[];
  categories: { slug: string; name: string }[];
  products: {
    slug: string;
    name: string;
    image: string;
    brandSlug: string;
    brandName: string;
    isPreOrder: boolean;
    summary?: string;
  }[];
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

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-900 outline-none focus:border-point-500"
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

/** Short explanation shown under the source selector for the current choice. */
const SOURCE_HINTS: Record<ProductSource["kind"], string> = {
  featured: "The most recently added active products.",
  "pre-order": "Products marked as pre-order.",
  "available-now": "Products that are not pre-order (in stock).",
  brand: "All active products from the selected brand.",
  category: "All active products in the selected category.",
  slugs: "Only the specific products you select below.",
};

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
      <p className="text-xs leading-5 text-zinc-400">
        {SOURCE_HINTS[value.kind]}
      </p>

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

// ── Hero slides ─────────────────────────────────────────────────────────────

const slideIconBtn =
  "inline-flex h-7 w-7 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent";

/**
 * Editable, collapsible list of hero slides. Each slide can be linked to an
 * existing product to pre-fill its image/name/link (editable as overrides), or
 * set up fully custom. Cards collapse so a long list doesn't force scrolling.
 */
export function HeroSlidesField({
  value,
  onChange,
  options,
}: {
  value: HeroSlide[];
  onChange: (slides: HeroSlide[]) => void;
  options: SectionFormOptions;
}) {
  const slides = value ?? [];
  const [openId, setOpenId] = useState<string | null>(null);
  const [expandAll, setExpandAll] = useState(false);

  function updateSlide(id: string, patch: Partial<HeroSlide>) {
    onChange(slides.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function addSlide() {
    const id = crypto.randomUUID();
    onChange([
      ...slides,
      {
        id,
        image: "",
        title: "",
        description: "",
        brand: "",
        href: "",
        preorder: false,
      },
    ]);
    setExpandAll(false);
    setOpenId(id);
  }
  function removeSlide(id: string) {
    onChange(slides.filter((s) => s.id !== id));
    if (openId === id) setOpenId(null);
  }
  function moveSlide(id: string, dir: -1 | 1) {
    const index = slides.findIndex((s) => s.id === id);
    const target = index + dir;
    if (index < 0 || target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }
  function toggleOpen(id: string) {
    setExpandAll(false);
    setOpenId((cur) => (cur === id ? null : id));
  }
  function applyProduct(
    id: string,
    product: SectionFormOptions["products"][number],
  ) {
    updateSlide(id, {
      productSlug: product.slug,
      image: product.image,
      title: product.name,
      brand: product.brandName,
      href: `/products/${product.slug}`,
      description: product.summary ?? "",
      preorder: product.isPreOrder,
    });
  }

  return (
    <div className="space-y-3">
      {slides.length > 0 && (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => {
              setExpandAll((v) => !v);
              setOpenId(null);
            }}
            className="text-xs font-medium text-zinc-500 hover:text-point-500"
          >
            {expandAll ? "Collapse all" : "Expand all"}
          </button>
        </div>
      )}

      {slides.length === 0 && (
        <p className="text-sm text-zinc-400">No slides yet.</p>
      )}

      {slides.map((slide, i) => {
        const open = expandAll || slide.id === openId;
        const product = options.products.find(
          (p) => p.slug === slide.productSlug,
        );
        return (
          <div
            key={slide.id}
            className="rounded-lg border border-zinc-200"
          >
            {/* Header — always visible; click to expand/collapse. */}
            <div
              className="flex cursor-pointer items-center gap-2 p-3"
              onClick={() => toggleOpen(slide.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleOpen(slide.id);
                }
              }}
            >
              <ChevronRight
                size={16}
                className={`shrink-0 text-zinc-400 transition-transform ${
                  open ? "rotate-90" : ""
                }`}
              />
              {slide.image ? (
                <div
                  className="h-10 w-10 shrink-0 rounded bg-zinc-100 bg-cover bg-center"
                  style={{ backgroundImage: `url(${slide.image})` }}
                  aria-hidden
                />
              ) : (
                <div className="h-10 w-10 shrink-0 rounded bg-zinc-100" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-zinc-800">
                  {slide.title || `Slide ${i + 1}`}
                </div>
                <div className="truncate text-xs text-zinc-400">
                  {product
                    ? `Linked: ${product.name}`
                    : slide.brand || "Custom slide"}
                </div>
              </div>
              <div
                className="flex shrink-0 items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => moveSlide(slide.id, -1)}
                  disabled={i === 0}
                  aria-label="Move slide up"
                  className={slideIconBtn}
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => moveSlide(slide.id, 1)}
                  disabled={i === slides.length - 1}
                  aria-label="Move slide down"
                  className={slideIconBtn}
                >
                  <ChevronDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => removeSlide(slide.id)}
                  className="ml-1 text-xs font-medium text-red-500 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>

            {/* Body — only when expanded. */}
            {open && (
              <div className="border-t border-zinc-100 p-3">
                <div className="grid gap-3">
                  <SelectField
                    label="Link to product (optional)"
                    value={slide.productSlug ?? ""}
                    onChange={(slug) => {
                      const picked = options.products.find(
                        (p) => p.slug === slug,
                      );
                      if (picked) applyProduct(slide.id, picked);
                      else updateSlide(slide.id, { productSlug: undefined });
                    }}
                    options={[
                      { value: "", label: "Custom (no product)" },
                      ...options.products.map((p) => ({
                        value: p.slug,
                        label: p.name,
                      })),
                    ]}
                  />
                  {product && (
                    <div className="flex items-center justify-between gap-2 rounded-md bg-zinc-50 px-3 py-2">
                      <span className="text-xs text-zinc-500">
                        Pre-filled from the product. Edit any field to override.
                      </span>
                      <button
                        type="button"
                        onClick={() => applyProduct(slide.id, product)}
                        className="shrink-0 text-xs font-medium text-point-500 hover:underline"
                      >
                        Refresh
                      </button>
                    </div>
                  )}
                  <ImageField
                    value={slide.image}
                    onChange={(v) => updateSlide(slide.id, { image: v })}
                    label="Image"
                  />
                  <TextField
                    label="Title"
                    value={slide.title ?? ""}
                    onChange={(v) => updateSlide(slide.id, { title: v })}
                  />
                  <TextAreaField
                    label="Description"
                    value={slide.description ?? ""}
                    onChange={(v) => updateSlide(slide.id, { description: v })}
                    hint="Use a line break to split the two lines shown on the banner."
                  />
                  <TextField
                    label="Brand"
                    value={slide.brand ?? ""}
                    onChange={(v) => updateSlide(slide.id, { brand: v })}
                  />
                  <TextField
                    label="Link"
                    value={slide.href ?? ""}
                    onChange={(v) => updateSlide(slide.id, { href: v })}
                    placeholder="/products/slug"
                  />
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(slide.preorder)}
                      onChange={(e) =>
                        updateSlide(slide.id, { preorder: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-zinc-300 accent-point-500"
                    />
                    <span className="text-sm text-zinc-700">
                      Pre-order badge
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={addSlide}
        className="inline-flex h-9 items-center justify-center rounded border border-dashed border-zinc-300 px-3 text-sm font-medium text-zinc-600 hover:border-point-500 hover:text-point-500"
      >
        + Add slide
      </button>
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
