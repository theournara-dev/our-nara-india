"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { ChevronDown, ChevronRight, ChevronUp } from "lucide-react";
import { ImageField } from "@/components/admin/image-field";
import { inputCls, labelCls } from "@/components/admin/field-styles";
import {
  LinkField,
  type LinkFieldOptions,
} from "@/components/admin/link-field";
import {
  useUploadQueue,
  checkPickedFile,
} from "@/components/upload/upload-queue";
import { notify } from "@/lib/toast";
import type {
  AmbassadorImageConfig,
  HeroSlide,
  InstagramItem,
  ProductSource,
  ShortItem,
  ShowcaseBanner,
  ShowcaseTab,
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
  banners: {
    id: string;
    title: string;
    image: string;
    mobileImage: string | null;
    alt: string | null;
    href: string | null;
    placement: string;
    isActive: boolean;
    /** Active *and* inside its schedule — what the storefront will render. */
    live: boolean;
    /** Content composition — previews render exactly what the storefront will. */
    style: string;
    heading: string | null;
    subheading: string | null;
    textAlign: string;
    textVAlign: string;
    textColor: string | null;
    scrim: boolean;
  }[];
}

export { inputCls, labelCls };

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
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  hint?: string;
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
      {hint && <span className="mt-1 block text-xs text-zinc-400">{hint}</span>}
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

// ── Storefront link builder ─────────────────────────────────────────────────

/**
 * The page builder's link field: the shared selector (kind → target) with the
 * section form's options narrowed down to what it needs.
 */
export function MoreLinkField({
  value,
  onChange,
  options,
  label = "More link (optional)",
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SectionFormOptions;
  label?: string;
  hint?: string;
}) {
  const linkOptions: LinkFieldOptions = {
    brands: options.brands,
    categories: options.categories,
    products: options.products.map((p) => ({ slug: p.slug, name: p.name })),
  };
  return (
    <LinkField
      value={value}
      onChange={onChange}
      options={linkOptions}
      label={label}
      hint={hint}
    />
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
/** Shared searchable multi-select checkbox list. */
function SearchableCheckboxList<T extends { id: string }>({
  items,
  value,
  onChange,
  getLabel,
  getMeta,
  getThumbnail,
  placeholder,
  emptyText,
  label,
}: {
  items: T[];
  value: string[];
  onChange: (ids: string[]) => void;
  getLabel: (item: T) => string;
  getMeta?: (item: T) => string;
  getThumbnail?: (item: T) => string;
  placeholder: string;
  emptyText: string;
  label: string;
}) {
  const [query, setQuery] = useState("");
  const selected = new Set(value);
  const filtered = items.filter((item) =>
    getLabel(item).toLowerCase().includes(query.trim().toLowerCase()),
  );

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  }

  return (
    <div>
      <span className={labelCls}>{label}</span>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
      <div className="mt-1 max-h-48 overflow-y-auto rounded border border-zinc-200">
        {filtered.length === 0 ? (
          <p className="px-2 py-2 text-xs text-zinc-400">{emptyText}</p>
        ) : (
          filtered.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={() => toggle(item.id)}
                className="h-4 w-4 rounded border-zinc-300 accent-point-500"
              />
              {getThumbnail && (
                <Image
                  src={getThumbnail(item)}
                  alt=""
                  width={40}
                  height={24}
                  unoptimized
                  className="h-6 w-10 shrink-0 rounded object-cover"
                />
              )}
              <span className="min-w-0 flex-1 truncate">{getLabel(item)}</span>
              {getMeta && (
                <span className="shrink-0 text-xs text-zinc-400">
                  {getMeta(item)}
                </span>
              )}
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
  return (
    <SearchableCheckboxList
      items={options.products.map((p) => ({ id: p.slug, name: p.name }))}
      value={value}
      onChange={onChange}
      getLabel={(p) => p.name}
      placeholder="Search products…"
      emptyText="No products match."
      label="Products"
    />
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
          <div key={slide.id} className="rounded-lg border border-zinc-200">
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
                <div
                  className="h-10 w-10 shrink-0 rounded bg-zinc-100"
                  aria-hidden
                />
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
                  <LinkField
                    label="Link (optional)"
                    value={slide.href ?? ""}
                    onChange={(v) => updateSlide(slide.id, { href: v })}
                    options={{
                      brands: options.brands,
                      categories: options.categories,
                      products: options.products.map((p) => ({
                        slug: p.slug,
                        name: p.name,
                      })),
                    }}
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
        href: "",
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
            <LinkField
              label="Link (optional)"
              value={box.href ?? ""}
              onChange={(v) => updateBox(box.id, { href: v })}
              options={{
                brands: options.brands,
                categories: options.categories,
                products: options.products.map((p) => ({
                  slug: p.slug,
                  name: p.name,
                })),
              }}
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

/**
 * Up to three promo banners above a product section (the brand sections on the
 * home page). "image" shows the uploaded artwork as-is; "custom" overlays a
 * title and subtitle in the lower-left corner so a banner can be composed from
 * any upload.
 */
export function ShowcaseBannersField({
  value,
  onChange,
  options,
}: {
  value: ShowcaseBanner[];
  onChange: (banners: ShowcaseBanner[]) => void;
  options: SectionFormOptions;
}) {
  const banners = value ?? [];
  const linkOptions: LinkFieldOptions = {
    brands: options.brands,
    categories: options.categories,
    products: options.products.map((p) => ({ slug: p.slug, name: p.name })),
  };

  function update(id: string, patch: Partial<ShowcaseBanner>) {
    onChange(banners.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }
  function add() {
    if (banners.length >= 3) return;
    onChange([
      ...banners,
      {
        id: crypto.randomUUID(),
        image: "",
        href: "",
        title: "",
        sub: "",
        style: "image",
      },
    ]);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-5 text-zinc-400">
        Banners above this section — one runs full width, two or three share the
        row (used by the brand sections). Up to three.
      </p>
      {banners.map((banner, index) => (
        <div key={banner.id} className="rounded-lg border border-zinc-200 p-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700">
              Banner {index + 1}
            </span>
            <button
              type="button"
              onClick={() =>
                onChange(banners.filter((b) => b.id !== banner.id))
              }
              className="text-xs font-medium text-red-500 hover:underline"
            >
              Remove
            </button>
          </div>
          <div className="grid gap-3 [&>*]:min-w-0">
            <ImageField
              value={banner.image}
              onChange={(v) => update(banner.id, { image: v })}
              label="Image"
            />
            <SelectField
              label="Style"
              value={banner.style ?? "image"}
              onChange={(v) =>
                update(banner.id, { style: v as ShowcaseBanner["style"] })
              }
              options={[
                {
                  value: "image",
                  label: "Image only — the artwork as uploaded",
                },
                {
                  value: "custom",
                  label: "Custom — title & subtitle over the image",
                },
              ]}
            />
            {banner.style === "custom" && (
              <>
                <TextField
                  label="Title"
                  value={banner.title ?? ""}
                  onChange={(v) => update(banner.id, { title: v })}
                />
                <TextField
                  label="Subtitle"
                  value={banner.sub ?? ""}
                  onChange={(v) => update(banner.id, { sub: v })}
                />
              </>
            )}
            <LinkField
              label="Link (optional)"
              value={banner.href ?? ""}
              onChange={(v) => update(banner.id, { href: v })}
              options={linkOptions}
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        disabled={banners.length >= 3}
        className="inline-flex h-9 items-center justify-center rounded border border-dashed border-zinc-300 px-3 text-sm font-medium text-zinc-600 hover:border-point-500 hover:text-point-500 disabled:opacity-50"
      >
        + Add banner
      </button>
    </div>
  );
}

/**
 * Editor for the tabbed showcase: each tab is a category (label), a banner
 * (image, optional headline/subtitle and the link it leads to) and a curated
 * product list.
 */
export function ShowcaseTabsField({
  value,
  onChange,
  options,
}: {
  value: ShowcaseTab[];
  onChange: (tabs: ShowcaseTab[]) => void;
  options: SectionFormOptions;
}) {
  const tabs = value ?? [];
  const [openId, setOpenId] = useState<string | null>(null);
  const [expandAll, setExpandAll] = useState(false);

  function updateTab(id: string, patch: Partial<ShowcaseTab>) {
    onChange(tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }
  function addTab() {
    const id = crypto.randomUUID();
    onChange([
      ...tabs,
      {
        id,
        label: "",
        brandSlug: "",
        image: "",
        alt: "",
        title: "",
        sub: "",
        href: "",
        productSlugs: [],
        columns: 4,
        rows: 1,
      },
    ]);
    setExpandAll(false);
    setOpenId(id);
  }
  function removeTab(id: string) {
    onChange(tabs.filter((t) => t.id !== id));
    if (openId === id) setOpenId(null);
  }
  function moveTab(id: string, dir: -1 | 1) {
    const index = tabs.findIndex((t) => t.id === id);
    const target = index + dir;
    if (index < 0 || target < 0 || target >= tabs.length) return;
    const next = [...tabs];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }
  function toggleOpen(id: string) {
    setExpandAll(false);
    setOpenId((cur) => (cur === id ? null : id));
  }

  const linkOptions: LinkFieldOptions = {
    brands: options.brands,
    categories: options.categories,
    products: options.products.map((p) => ({ slug: p.slug, name: p.name })),
  };

  return (
    <div className="space-y-3">
      {tabs.length > 0 && (
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

      {tabs.length === 0 && (
        <p className="text-sm text-zinc-400">No filters yet.</p>
      )}

      {tabs.map((tab, i) => {
        const open = expandAll || tab.id === openId;
        const brandName =
          options.brands.find((b) => b.slug === tab.brandSlug)?.name ?? "";
        // The product picker offers the attached brand's products, plus any
        // product already picked from elsewhere so nothing can be lost by
        // switching or clearing the brand.
        const brandProducts = tab.brandSlug
          ? options.products.filter(
              (p) =>
                p.brandSlug === tab.brandSlug ||
                tab.productSlugs.includes(p.slug),
            )
          : options.products;
        const rowCap = (tab.columns ?? 4) * (tab.rows ?? 1);
        return (
          <div key={tab.id} className="rounded-lg border border-zinc-200">
            {/* Header — always visible; click to expand/collapse. */}
            <div
              className="flex cursor-pointer items-center gap-2 p-3"
              onClick={() => toggleOpen(tab.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleOpen(tab.id);
                }
              }}
            >
              <ChevronRight
                size={16}
                className={`shrink-0 text-zinc-400 transition-transform ${
                  open ? "rotate-90" : ""
                }`}
              />
              {tab.image ? (
                <div
                  className="h-10 w-16 shrink-0 rounded bg-zinc-100 bg-cover bg-center"
                  style={{ backgroundImage: `url(${tab.image})` }}
                  aria-hidden
                />
              ) : (
                <div
                  className="h-10 w-16 shrink-0 rounded bg-zinc-100"
                  aria-hidden
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-zinc-800">
                  {tab.label || brandName || `Filter ${i + 1}`}
                </div>
                <div className="truncate text-xs text-zinc-400">
                  {tab.productSlugs.length} product
                  {tab.productSlugs.length === 1 ? "" : "s"}
                  {brandName ? ` · ${brandName}` : " · no brand attached"}
                </div>
              </div>
              <div
                className="flex shrink-0 items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => moveTab(tab.id, -1)}
                  disabled={i === 0}
                  aria-label="Move tab up"
                  className={slideIconBtn}
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => moveTab(tab.id, 1)}
                  disabled={i === tabs.length - 1}
                  aria-label="Move tab down"
                  className={slideIconBtn}
                >
                  <ChevronDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => removeTab(tab.id)}
                  className="ml-1 text-xs font-medium text-red-500 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>

            {/* Body — only when expanded. `min-w-0` on every row keeps long
                product lists from widening the card past the panel. */}
            {open && (
              <div className="border-t border-zinc-100 p-3">
                <div className="grid gap-3 [&>*]:min-w-0">
                  <SelectField
                    label="Brand"
                    value={tab.brandSlug || ""}
                    onChange={(v) =>
                      updateTab(tab.id, {
                        brandSlug: v,
                        // A filter shows one brand, so drop products that are
                        // no longer in it.
                        productSlugs: v
                          ? tab.productSlugs.filter((slug) =>
                              options.products.some(
                                (p) => p.slug === slug && p.brandSlug === v,
                              ),
                            )
                          : tab.productSlugs,
                      })
                    }
                    options={[
                      { value: "", label: "Choose a brand…" },
                      ...options.brands.map((b) => ({
                        value: b.slug,
                        label: b.name,
                      })),
                    ]}
                  />
                  <p className="text-xs leading-5 text-zinc-400">
                    The filter opens this brand&apos;s page when the banner is
                    clicked.
                  </p>
                  <TextField
                    label="Filter label (optional)"
                    value={tab.label}
                    onChange={(v) => updateTab(tab.id, { label: v })}
                    placeholder="e.g. Brightening"
                  />
                  <p className="text-xs leading-5 text-zinc-400">
                    Leave it empty to show the brand&apos;s name instead.
                  </p>
                  <LinkField
                    label="Banner link (optional)"
                    value={tab.href}
                    onChange={(v) => updateTab(tab.id, { href: v })}
                    options={linkOptions}
                    hint="Defaults to the brand page above."
                  />
                  <ImageField
                    value={tab.image}
                    onChange={(v) => updateTab(tab.id, { image: v })}
                    label="Banner image"
                  />
                  <TextField
                    label="Banner headline (optional)"
                    value={tab.title}
                    onChange={(v) => updateTab(tab.id, { title: v })}
                  />
                  <TextField
                    label="Banner subtitle (optional)"
                    value={tab.sub}
                    onChange={(v) => updateTab(tab.id, { sub: v })}
                  />
                  <TextField
                    label="Alt text"
                    value={tab.alt}
                    onChange={(v) => updateTab(tab.id, { alt: v })}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <NumberField
                      label="Columns"
                      value={tab.columns ?? 4}
                      min={2}
                      max={6}
                      onChange={(columns) => updateTab(tab.id, { columns })}
                    />
                    <NumberField
                      label="Rows"
                      value={tab.rows ?? 1}
                      min={1}
                      max={5}
                      onChange={(rows) => updateTab(tab.id, { rows })}
                    />
                  </div>
                  <p className="text-xs leading-5 text-zinc-400">
                    This filter shows at most {rowCap} product
                    {rowCap === 1 ? "" : "s"} ({tab.columns ?? 4} ×{" "}
                    {tab.rows ?? 1}).
                  </p>
                  <SearchableCheckboxList
                    items={brandProducts.map((p) => ({
                      id: p.slug,
                      name: p.name,
                      brand: p.brandName,
                    }))}
                    value={tab.productSlugs}
                    onChange={(v) => updateTab(tab.id, { productSlugs: v })}
                    getLabel={(p) => p.name}
                    getMeta={(p) => p.brand}
                    placeholder="Search this brand's products…"
                    emptyText={
                      tab.brandSlug
                        ? "This brand has no products yet."
                        : "Pick a brand above, or search every product."
                    }
                    label="Products of this brand"
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={addTab}
        className="inline-flex h-9 items-center justify-center rounded border border-dashed border-zinc-300 px-3 text-sm font-medium text-zinc-600 hover:border-point-500 hover:text-point-500"
      >
        + Add filter
      </button>
    </div>
  );
}

// ── Ambassador stage ────────────────────────────────────────────────────────

/**
 * Editor for the /ambassador image sequence: add, reorder, link and caption
 * any number of images. The tiles swap on the storefront as the visitor
 * scrolls.
 */
export function AmbassadorImagesField({
  value,
  onChange,
  options,
}: {
  value: AmbassadorImageConfig[];
  onChange: (images: AmbassadorImageConfig[]) => void;
  options: SectionFormOptions;
}) {
  const images = value ?? [];
  const linkOptions: LinkFieldOptions = {
    brands: options.brands,
    categories: options.categories,
    products: options.products.map((p) => ({ slug: p.slug, name: p.name })),
  };

  function update(index: number, patch: Partial<AmbassadorImageConfig>) {
    onChange(
      images.map((img, i) => (i === index ? { ...img, ...patch } : img)),
    );
  }
  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-5 text-zinc-400">
        The images that fill the left half of the ambassador page, in order —
        they change one by one while the page is pinned, as the visitor scrolls.
        Upload as many as you need; the section releases and the page carries on
        once the last image is reached.
      </p>
      {images.map((img, i) => (
        <div
          key={img.id}
          className="space-y-3 rounded-lg border border-zinc-200 p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="rounded bg-white px-2 py-0.5 text-xs font-semibold text-zinc-600">
              Image {i + 1}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label={`Move image ${i + 1} up`}
                className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50 disabled:opacity-40"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === images.length - 1}
                aria-label={`Move image ${i + 1} down`}
                className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50 disabled:opacity-40"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => onChange(images.filter((_, j) => j !== i))}
                className="rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-rose-500 hover:bg-rose-50"
              >
                Remove
              </button>
            </div>
          </div>
          <ImageField
            label="Image"
            value={img.image}
            onChange={(image) => update(i, { image })}
            hint="Fills the left half of the stage; any aspect works."
          />
          <div className="grid gap-3 [&>*]:min-w-0 sm:grid-cols-2">
            <TextField
              label="Alt text (optional)"
              value={img.alt}
              onChange={(alt) => update(i, { alt })}
            />
            <LinkField
              label="Link (optional)"
              value={img.href}
              onChange={(href) => update(i, { href })}
              options={linkOptions}
              hint="Opens when the image is clicked."
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([
            ...images,
            { id: crypto.randomUUID(), image: "", alt: "", href: "" },
          ])
        }
        className="inline-flex h-9 items-center justify-center rounded border border-dashed border-zinc-300 px-3 text-sm font-medium text-zinc-600 hover:border-point-500 hover:text-point-500"
      >
        + Add image
      </button>
    </div>
  );
}

// ── Collapsible list (shared by shorts / instagram editors) ──────────────────

const listIconBtn =
  "inline-flex h-7 w-7 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent";

/**
 * A collapsible, reorderable list editor. Each item collapses to a header
 * (title + subtitle + move/remove) and expands to a body rendered by the
 * caller. Used by the shorts and instagram section forms.
 */
export function CollapsibleList<T extends { id: string }>({
  items,
  onChange,
  getTitle,
  getSubtitle,
  renderBody,
  addLabel,
  newItem,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  getTitle: (item: T, index: number) => string;
  getSubtitle?: (item: T) => string;
  renderBody: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
  addLabel: string;
  newItem: () => Omit<T, "id">;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [expandAll, setExpandAll] = useState(false);

  function update(id: string, patch: Partial<T>) {
    onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }
  function add() {
    const id = crypto.randomUUID();
    onChange([...items, { ...newItem(), id } as T]);
    setExpandAll(false);
    setOpenId(id);
  }
  function remove(id: string) {
    onChange(items.filter((i) => i.id !== id));
    if (openId === id) setOpenId(null);
  }
  function move(id: string, dir: -1 | 1) {
    const index = items.findIndex((i) => i.id === id);
    const target = index + dir;
    if (index < 0 || target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }
  function toggle(id: string) {
    setExpandAll(false);
    setOpenId((cur) => (cur === id ? null : id));
  }

  return (
    <div className="space-y-3">
      {items.length > 0 && (
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

      {items.length === 0 && (
        <p className="text-sm text-zinc-400">No items yet.</p>
      )}

      {items.map((item, i) => {
        const open = expandAll || item.id === openId;
        return (
          <div key={item.id} className="rounded-lg border border-zinc-200">
            <div
              className="flex cursor-pointer items-center gap-2 p-3"
              onClick={() => toggle(item.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle(item.id);
                }
              }}
            >
              <ChevronRight
                size={16}
                className={`shrink-0 text-zinc-400 transition-transform ${
                  open ? "rotate-90" : ""
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-zinc-800">
                  {getTitle(item, i)}
                </div>
                {getSubtitle && (
                  <div className="truncate text-xs text-zinc-400">
                    {getSubtitle(item)}
                  </div>
                )}
              </div>
              <div
                className="flex shrink-0 items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => move(item.id, -1)}
                  disabled={i === 0}
                  aria-label="Move up"
                  className={listIconBtn}
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => move(item.id, 1)}
                  disabled={i === items.length - 1}
                  aria-label="Move down"
                  className={listIconBtn}
                >
                  <ChevronDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="ml-1 text-xs font-medium text-red-500 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
            {open && (
              <div className="border-t border-zinc-100 p-3">
                {renderBody(item, (patch) => update(item.id, patch))}
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={add}
        className="inline-flex h-9 items-center justify-center rounded border border-dashed border-zinc-300 px-3 text-sm font-medium text-zinc-600 hover:border-point-500 hover:text-point-500"
      >
        {addLabel}
      </button>
    </div>
  );
}

// ── Video source (link or uploaded file) ─────────────────────────────────────

/**
 * Video source picker: paste a reel link (YouTube / TikTok / Instagram) or
 * upload a video file. Keeps `videoUrl` and `videoFile` in sync with the
 * parent form (only one is set at a time).
 */
export function VideoField({
  value,
  onChange,
  hint,
}: {
  value: { videoUrl?: string; videoFile?: string };
  onChange: (v: { videoUrl?: string; videoFile?: string }) => void;
  hint?: string;
}) {
  const queue = useUploadQueue();
  const fieldId = useId();
  const [mode, setMode] = useState<"link" | "upload">(
    value.videoFile ? "upload" : "link",
  );
  const [urlInput, setUrlInput] = useState(value.videoUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [pendingName, setPendingName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const pendingIdRef = useRef<string | null>(null);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // A picked-but-unsaved video is dropped when the editor closes.
  useEffect(
    () => () => {
      if (pendingIdRef.current) queue?.unregister(pendingIdRef.current);
    },
    [queue],
  );

  async function onFile(file: File | undefined) {
    if (!file) return;
    const problem = checkPickedFile(file, "video");
    if (problem) {
      notify.error("Unsupported file", problem);
      return;
    }
    if (!queue) {
      // Outside a queued form: upload straight away, as before.
      setUploading(true);
      const toastId = notify.loading("Uploading video…");
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/admin/upload-video", {
          method: "POST",
          body: formData,
        });
        const data = (await res.json().catch(() => ({}))) as {
          url?: string;
          error?: string;
        };
        if (!res.ok || !data.url)
          throw new Error(data.error ?? "Upload failed");
        onChangeRef.current({ videoFile: data.url, videoUrl: undefined });
        notify.success(toastId, "Video uploaded");
      } catch (err) {
        notify.error(
          toastId,
          "Upload failed",
          err instanceof Error ? err.message : "Try again.",
        );
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      }
      return;
    }

    // Hold the file until the form saves (see upload-queue.tsx).
    if (pendingIdRef.current) queue.unregister(pendingIdRef.current);
    const id = `${fieldId}-video`;
    pendingIdRef.current = id;
    setPendingName(file.name);
    queue.register({
      id,
      file,
      endpoint: "/api/admin/upload-video",
      apply: (url) => {
        pendingIdRef.current = null;
        setPendingName(null);
        onChangeRef.current({ videoFile: url, videoUrl: undefined });
      },
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  const tabCls = (active: boolean) =>
    `flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
      active
        ? "bg-white text-zinc-900 shadow-sm"
        : "text-zinc-500 hover:text-zinc-800"
    }`;

  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3">
      {hint && <p className="mb-2 text-xs text-zinc-400">{hint}</p>}
      <div className="mb-2 flex items-center gap-1 rounded-lg bg-zinc-100 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("link");
            onChange({ videoUrl: value.videoUrl, videoFile: undefined });
          }}
          className={tabCls(mode === "link")}
        >
          Link
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("upload");
            onChange({ videoFile: value.videoFile, videoUrl: undefined });
          }}
          className={tabCls(mode === "upload")}
        >
          Upload
        </button>
      </div>
      {mode === "link" ? (
        <div className="flex items-center gap-2">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste reel link (YouTube / TikTok / Instagram)…"
            className={inputCls}
          />
          <button
            type="button"
            onClick={() => {
              const v = urlInput.trim();
              if (v) onChange({ videoUrl: v, videoFile: undefined });
            }}
            className="inline-flex h-9 shrink-0 items-center rounded border border-zinc-200 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            Set
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            onChange={(e) => onFile(e.target.files?.[0])}
            className="hidden"
            aria-label="Upload video"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex h-9 shrink-0 items-center rounded bg-point-500 px-3 text-sm font-medium text-white hover:bg-point-600 disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Upload video"}
          </button>
          {pendingName && (
            <span
              className="truncate text-xs text-zinc-500"
              title={`Uploads when you save: ${pendingName}`}
            >
              {pendingName} · uploads on save
            </span>
          )}
          {!pendingName && value.videoFile && (
            <span className="truncate text-xs text-zinc-400">Uploaded ✓</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Shorts items ─────────────────────────────────────────────────────────────

export function ShortsItemsField({
  value,
  onChange,
}: {
  value: ShortItem[];
  onChange: (items: ShortItem[]) => void;
}) {
  return (
    <CollapsibleList<ShortItem>
      items={value ?? []}
      onChange={onChange}
      getTitle={(item, i) => item.title || `Short ${i + 1}`}
      getSubtitle={(item) =>
        item.videoFile
          ? "Uploaded video"
          : item.videoUrl
            ? "Reel link"
            : "No video"
      }
      addLabel="+ Add short"
      newItem={() => ({
        title: "",
        videoUrl: "",
        videoFile: "",
        posterUrl: "",
        productHref: "",
      })}
      renderBody={(item, update) => (
        <div className="grid gap-3">
          <TextField
            label="Title"
            value={item.title ?? ""}
            onChange={(v) => update({ title: v })}
          />
          <VideoField
            value={{ videoUrl: item.videoUrl, videoFile: item.videoFile }}
            onChange={(v) => update(v)}
            hint="Paste a reel link or upload a video file."
          />
          <ImageField
            label="Poster image"
            value={item.posterUrl ?? ""}
            onChange={(v) => update({ posterUrl: v })}
          />
          <TextField
            label="Product link (optional)"
            value={item.productHref ?? ""}
            onChange={(v) => update({ productHref: v })}
            placeholder="/products/slug"
          />
          <ImageField
            label="Product image (info bar, optional)"
            value={item.productImage ?? ""}
            onChange={(v) => update({ productImage: v })}
          />
          <TextField
            label="Brand (optional)"
            value={item.brand ?? ""}
            onChange={(v) => update({ brand: v })}
            placeholder="NOWATER"
          />
          <TextField
            label="Tags (optional, comma separated)"
            value={(item.shortTags ?? []).join(", ")}
            onChange={(v) =>
              update({
                shortTags: v
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Soothing, PoreCare"
          />
          <TextField
            label="Price (optional, minor units e.g. cents)"
            value={item.priceCents != null ? String(item.priceCents) : ""}
            onChange={(v) => {
              const n = Number(v);
              update({ priceCents: v && Number.isFinite(n) ? n : undefined });
            }}
            placeholder="210000"
          />
          <TextField
            label="Currency (optional)"
            value={item.currency ?? ""}
            onChange={(v) => update({ currency: v || undefined })}
            placeholder="INR"
          />
        </div>
      )}
    />
  );
}

// ── Instagram items ──────────────────────────────────────────────────────────

export function InstagramItemsField({
  value,
  onChange,
}: {
  value: InstagramItem[];
  onChange: (items: InstagramItem[]) => void;
}) {
  return (
    <CollapsibleList<InstagramItem>
      items={value ?? []}
      onChange={onChange}
      getTitle={(_item, i) => `Post ${i + 1}`}
      getSubtitle={(item) => item.href || "No link"}
      addLabel="+ Add post"
      newItem={() => ({ image: "", alt: "", href: "" })}
      renderBody={(item, update) => (
        <div className="grid gap-3">
          <ImageField
            label="Image"
            value={item.image}
            onChange={(v) => update({ image: v })}
          />
          <TextField
            label="Alt text"
            value={item.alt ?? ""}
            onChange={(v) => update({ alt: v })}
          />
          <TextField
            label="Instagram link"
            value={item.href ?? ""}
            onChange={(v) => update({ href: v })}
            placeholder="https://www.instagram.com/reel/…"
          />
        </div>
      )}
    />
  );
}

// ── Banners (long banner section) ────────────────────────────────────────────

/** Searchable checkbox list for picking which banners to show. */
export function BannersField({
  value,
  onChange,
  options,
  label = "Banners",
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  options: SectionFormOptions;
  label?: string;
}) {
  return (
    <SearchableCheckboxList
      items={options.banners.map((b) => ({
        id: b.id,
        title: b.title,
        placement: b.placement,
        image: b.image,
      }))}
      value={value}
      onChange={onChange}
      getLabel={(b) => b.title}
      getMeta={(b) => b.placement}
      getThumbnail={(b) => b.image}
      placeholder="Search banners…"
      emptyText="No banners match."
      label={label}
    />
  );
}
