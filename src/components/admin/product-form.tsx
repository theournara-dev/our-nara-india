"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/slug";
import { notify } from "@/lib/toast";
import { formatMoney } from "@/lib/money";
import {
  createProduct,
  updateProduct,
  createBrand,
  createCategory,
  type ProductInput,
} from "@/app/admin/products/actions";
import {
  BlockBuilder,
  type BlockDraftState,
} from "@/components/admin/product-blocks/builder";
import {
  InfoRowsEditor,
  type InfoRowDraft,
} from "@/components/admin/info-rows-editor";
import {
  ProductReviewsManager,
  type AdminReviewRow,
} from "@/components/admin/product-reviews-manager";
import { ProductBlocks } from "@/components/product/blocks/block-renderer";
import { ImageListField } from "@/components/admin/image-field";
import {
  UploadQueueProvider,
  useUploadGate,
} from "@/components/upload/upload-queue";

type BrandOption = { id: string; name: string };
type CategoryOption = { id: string; name: string };

type VariantDraft = {
  id?: string;
  optionLabel: string;
  optionValue: string;
  sku: string;
  price: string; // rupees, optional
  globalPrice: string; // rupees, optional — international store override
  stock: number;
  isActive: boolean;
  /** Option images — the first one leads the gallery while this option is picked. */
  images: string[];
  /** Swatch colour hex (e.g. "#faddc3") for the option chip. */
  color: string;
};

type Props = {
  backHref: string;
  product?: {
    id: string;
    name: string;
    slug: string;
    brandId: string;
    categoryId: string;
    summary: string | null;
    shortTags: string[];
    description: string | null;
    priceCents: number;
    compareAtCents: number | null;
    globalPriceCents: number | null;
    globalCompareAtCents: number | null;
    /** Product-level stock for variantless products; null = untracked. */
    stock: number | null;
    currency: string;
    isPreOrder: boolean;
    preOrderNotice: string | null;
    images: string[];
    isActive: boolean;
    seoTitle: string | null;
    seoDescription: string | null;
    variants: {
      id: string;
      optionLabel: string | null;
      optionValue: string;
      sku: string;
      priceCents: number | null;
      globalPriceCents: number | null;
      stock: number;
      isActive: boolean;
      images: string[];
      color: string | null;
    }[];
    blocks: {
      id: string;
      type: string;
      title: string | null;
      config: unknown;
      sortOrder: number;
      isActive: boolean;
    }[];
    /** Per-product INFO override (JSON); empty = use the global template. */
    infoRows: unknown;
    /** Rows of the "Product Info" card under Buy Now (JSON). */
    buyInfoRows: unknown;
  } | null;
  brands: BrandOption[];
  categories: CategoryOption[];
  /** Storewide INFO rows, seeded into a product's INFO list on first edit. */
  globalInfoRows: InfoRowDraft[];
  /** Reviews for this product (edit mode only). */
  reviews?: AdminReviewRow[];
};

const inputCls =
  "h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500";
const labelCls = "mb-1 block text-xs font-medium text-zinc-500";

// Admin always shows the stored currency (INR) as-is; derive its symbol from
// formatMoney so it stays correct if the stored currency ever changes.
const CURRENCY_SYMBOL = formatMoney(100, "INR", { convert: false }).replace(
  /[\d.,\s]/g,
  "",
);

function toRupees(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(/\.00$/, "");
}

/** Coerce a stored JSON value into INFO row drafts for the repeater. */
function parseInfoRowDrafts(value: unknown): InfoRowDraft[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> =>
      Boolean(v && typeof v === "object" && !Array.isArray(v)),
    )
    .map((v) => ({
      heading: typeof v.heading === "string" ? v.heading : "",
      body: typeof v.body === "string" ? v.body : "",
      visible: v.visible !== false,
    }));
}

/**
 * Create/edit form for a product. Wrapped in an upload queue so images picked
 * here are only stored once the form is saved.
 */
export function ProductForm(props: Props) {
  return (
    <UploadQueueProvider>
      <ProductFormInner {...props} />
    </UploadQueueProvider>
  );
}

function ProductFormInner({
  product,
  brands: initialBrands,
  categories: initialCategories,
  backHref,
  globalInfoRows,
  reviews,
}: Props) {
  const isEdit = Boolean(product);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [brands, setBrands] = useState<BrandOption[]>(initialBrands);
  const [categories, setCategories] =
    useState<CategoryOption[]>(initialCategories);

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [brandId, setBrandId] = useState(product?.brandId ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [summary, setSummary] = useState(product?.summary ?? "");
  const [shortTags, setShortTags] = useState(
    (product?.shortTags ?? []).join(", "),
  );
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(toRupees(product?.priceCents));
  const [compareAt, setCompareAt] = useState(toRupees(product?.compareAtCents));
  const [globalPrice, setGlobalPrice] = useState(
    toRupees(product?.globalPriceCents),
  );
  const [globalCompareAt, setGlobalCompareAt] = useState(
    toRupees(product?.globalCompareAtCents),
  );
  // Empty string = untracked (null). Only used by products without variants.
  const [stock, setStock] = useState(
    product?.stock != null ? String(product.stock) : "",
  );
  const [isPreOrder, setIsPreOrder] = useState(product?.isPreOrder ?? false);
  const [preOrderNotice, setPreOrderNotice] = useState(
    product?.preOrderNotice ?? "",
  );
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [seoTitle, setSeoTitle] = useState(product?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(
    product?.seoDescription ?? "",
  );
  const [variants, setVariants] = useState<VariantDraft[]>(
    (product?.variants ?? []).map((v) => ({
      id: v.id,
      optionLabel: v.optionLabel ?? "",
      optionValue: v.optionValue,
      sku: v.sku,
      price: toRupees(v.priceCents),
      globalPrice: toRupees(v.globalPriceCents),
      stock: v.stock,
      isActive: v.isActive,
      images: v.images ?? [],
      color: v.color ?? "",
    })),
  );

  const [blocks, setBlocks] = useState<BlockDraftState[]>(
    (product?.blocks ?? []).map((b) => ({
      key: b.id,
      id: b.id,
      type: b.type,
      title: b.title ?? undefined,
      config:
        b.config && typeof b.config === "object" && !Array.isArray(b.config)
          ? (b.config as Record<string, unknown>)
          : {},
      isActive: b.isActive,
    })),
  );
  const [formTab, setFormTab] = useState<
    "product" | "content" | "info" | "reviews"
  >("product");
  // Seed the INFO list from the storewide template when the product has no
  // override yet, so the global sections show by default and can be hidden.
  const [infoRows, setInfoRows] = useState<InfoRowDraft[]>(() => {
    const own = parseInfoRowDrafts(product?.infoRows);
    if (own.length) return own;
    return globalInfoRows.map((r) => ({ ...r, visible: true }));
  });
  // The "Product Info" card under Buy Now is its own list, so it never starts
  // from the storewide INFO template.
  const [buyInfoRows, setBuyInfoRows] = useState<InfoRowDraft[]>(() =>
    parseInfoRowDrafts(product?.buyInfoRows),
  );

  const [showNewBrand, setShowNewBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [creatingBrand, setCreatingBrand] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const gate = useUploadGate();

  function onNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function onCreateBrand() {
    const name = newBrandName.trim();
    if (!name) return;
    setCreatingBrand(true);
    try {
      const brand = await createBrand(name);
      setBrandId(brand.id);
      setBrands((prev) => [...prev, brand]);
      setShowNewBrand(false);
      setNewBrandName("");
      notify.success("Brand created", brand.name);
    } catch (err) {
      notify.error(
        "Create failed",
        err instanceof Error ? err.message : "Try again.",
      );
    } finally {
      setCreatingBrand(false);
    }
  }

  async function onCreateCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setCreatingCategory(true);
    try {
      const category = await createCategory(name);
      setCategoryId(category.id);
      setCategories((prev) => [...prev, category]);
      setShowNewCategory(false);
      setNewCategoryName("");
      notify.success("Category created", category.name);
    } catch (err) {
      notify.error(
        "Create failed",
        err instanceof Error ? err.message : "Try again.",
      );
    } finally {
      setCreatingCategory(false);
    }
  }

  function updateVariant(index: number, patch: Partial<VariantDraft>) {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    );
  }

  function addVariant() {
    setVariants((prev) => [
      ...prev,
      {
        optionLabel: "",
        optionValue: "",
        sku: "",
        price: "",
        globalPrice: "",
        stock: 0,
        isActive: true,
        images: [],
        color: "",
      },
    ]);
  }

  function removeVariant(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Picked-but-unsaved images upload first; the save then runs again with
    // their URLs in place (see useUploadGate).
    void gate.save("product");
  }

  function submitProduct() {
    const input: ProductInput = {
      name: name.trim(),
      slug: slug.trim() || slugify(name),
      brandId,
      categoryId,
      summary: summary.trim() || undefined,
      shortTags: shortTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      description: description.trim() || undefined,
      priceCents: Math.round((parseFloat(price) || 0) * 100),
      compareAtCents: compareAt
        ? Math.round((parseFloat(compareAt) || 0) * 100)
        : undefined,
      globalPriceCents: globalPrice
        ? Math.round((parseFloat(globalPrice) || 0) * 100)
        : undefined,
      globalCompareAtCents: globalCompareAt
        ? Math.round((parseFloat(globalCompareAt) || 0) * 100)
        : undefined,
      stock:
        stock.trim() === ""
          ? null
          : Math.max(0, Math.floor(Number(stock) || 0)),
      currency: "INR",
      isPreOrder,
      preOrderNotice: preOrderNotice.trim() || undefined,
      images,
      isActive,
      seoTitle: seoTitle.trim() || undefined,
      seoDescription: seoDescription.trim() || undefined,
      variants: variants.map((v) => ({
        id: v.id,
        optionLabel: v.optionLabel.trim() || undefined,
        optionValue: v.optionValue.trim() || undefined,
        sku: v.sku.trim() || undefined,
        priceCents: v.price
          ? Math.round((parseFloat(v.price) || 0) * 100)
          : undefined,
        globalPriceCents: v.globalPrice
          ? Math.round((parseFloat(v.globalPrice) || 0) * 100)
          : undefined,
        stock: v.stock,
        isActive: v.isActive,
        images: v.images,
        color: v.color.trim() || undefined,
      })),
      blocks: blocks.map((b) => ({
        id: b.id,
        type: b.type,
        title: b.title,
        config: b.config,
        isActive: b.isActive,
      })),
      infoRows: infoRows.map((r) => ({
        heading: r.heading,
        body: r.body,
        visible: r.visible,
      })),
      buyInfoRows: buyInfoRows.map((r) => ({
        heading: r.heading,
        body: r.body,
        visible: true,
      })),
    };

    startTransition(async () => {
      const toastId = notify.loading(
        isEdit ? "Saving changes…" : "Creating product…",
      );
      try {
        if (isEdit && product) {
          await updateProduct(product.id, input);
          notify.success(toastId, "Product saved");
        } else {
          await createProduct(input);
          notify.success(toastId, "Product created");
          // Navigate back to the list after the create succeeds (the server
          // action no longer redirects, so we avoid the swallowed NEXT_REDIRECT).
          router.push(backHref);
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

  // Re-registered every render so the gate's second pass (after the pending
  // images upload) closes over the state that now holds their URLs.
  useEffect(() => {
    gate.registerHandler("product", submitProduct);
  });

  const activeBlocks = blocks
    .filter((b) => b.isActive)
    .map((b) => ({
      id: b.key,
      type: b.type,
      title: b.title,
      config: b.config,
    }));
  const visibleInfoRows = infoRows.filter((r) => r.visible);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 p-1">
        <button
          type="button"
          onClick={() => setFormTab("product")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            formTab === "product"
              ? "bg-white text-point-600 shadow-sm"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          Product
        </button>
        <button
          type="button"
          onClick={() => setFormTab("content")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            formTab === "content"
              ? "bg-white text-point-600 shadow-sm"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          Detail content
        </button>
        <button
          type="button"
          onClick={() => setFormTab("info")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            formTab === "info"
              ? "bg-white text-point-600 shadow-sm"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          INFO
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={() => setFormTab("reviews")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              formTab === "reviews"
                ? "bg-white text-point-600 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Reviews
          </button>
        )}
      </div>

      {formTab === "product" && (
        <>
          {/* Basic info */}
          <section className="rounded-2xl border border-zinc-100 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-zinc-900">
              Basic info
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className={labelCls}>Name</span>
                <input
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                  required
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Slug</span>
                <input
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                  required
                  pattern="[a-z0-9-]+"
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Status</span>
                <select
                  value={isActive ? "active" : "inactive"}
                  onChange={(e) => setIsActive(e.target.value === "active")}
                  className={inputCls}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <div>
                <span className={labelCls}>Brand</span>
                <div className="flex gap-2">
                  <select
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    required
                    className={inputCls}
                  >
                    <option value="">Select brand…</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (showNewBrand) {
                        setShowNewBrand(false);
                        setNewBrandName("");
                      } else {
                        setShowNewBrand(true);
                      }
                    }}
                    className={`shrink-0 rounded border px-2.5 text-xs font-medium ${
                      showNewBrand
                        ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    {showNewBrand ? "Cancel" : "+ New"}
                  </button>
                </div>
                {showNewBrand && (
                  // Not a <form>: this sits inside the product form, and nested
                  // forms are invalid HTML — the browser drops the inner one, so
                  // "Create" used to submit the product form instead.
                  <div className="mt-2 flex gap-2">
                    <input
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void onCreateBrand();
                        }
                      }}
                      placeholder="Brand name"
                      autoFocus
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={() => void onCreateBrand()}
                      disabled={creatingBrand || !newBrandName.trim()}
                      className="h-9 shrink-0 rounded bg-point-500 px-3 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {creatingBrand ? "…" : "Create"}
                    </button>
                  </div>
                )}
              </div>
              <div>
                <span className={labelCls}>Category</span>
                <div className="flex gap-2">
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                    className={inputCls}
                  >
                    <option value="">Select category…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (showNewCategory) {
                        setShowNewCategory(false);
                        setNewCategoryName("");
                      } else {
                        setShowNewCategory(true);
                      }
                    }}
                    className={`shrink-0 rounded border px-2.5 text-xs font-medium ${
                      showNewCategory
                        ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    {showNewCategory ? "Cancel" : "+ New"}
                  </button>
                </div>
                {showNewCategory && (
                  // See the brand block above: no nested <form> (invalid HTML).
                  <div className="mt-2 flex gap-2">
                    <input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void onCreateCategory();
                        }
                      }}
                      placeholder="Category name"
                      autoFocus
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={() => void onCreateCategory()}
                      disabled={creatingCategory || !newCategoryName.trim()}
                      className="h-9 shrink-0 rounded bg-point-500 px-3 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {creatingCategory ? "…" : "Create"}
                    </button>
                  </div>
                )}
              </div>
              <label className="block">
                <span className={labelCls}>Summary</span>
                <input
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Short tags (comma separated)</span>
                <input
                  value={shortTags}
                  onChange={(e) => setShortTags(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelCls}>Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-900 outline-none focus:border-point-500"
                />
              </label>
            </div>
          </section>

          {/* Pricing */}
          <section className="rounded-2xl border border-zinc-100 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-zinc-900">
              Pricing
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}>
                  Price ({CURRENCY_SYMBOL}, India)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>
                  Compare-at price ({CURRENCY_SYMBOL}, India, optional)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={compareAt}
                  onChange={(e) => setCompareAt(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>
                  Price ({CURRENCY_SYMBOL}, International)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={globalPrice}
                  onChange={(e) => setGlobalPrice(e.target.value)}
                  className={inputCls}
                />
                <span className="mt-1 block text-xs text-zinc-400">
                  Charged on the international store (KDrop). Leave empty to
                  charge the India price.
                </span>
              </label>
              <label className="block">
                <span className={labelCls}>
                  Compare-at price ({CURRENCY_SYMBOL}, International, optional)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={globalCompareAt}
                  onChange={(e) => setGlobalCompareAt(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Stock (optional)</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className={inputCls}
                />
                <span className="mt-1 block text-xs text-zinc-400">
                  Only for products without variants. Leave empty to not track
                  stock.
                </span>
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={isPreOrder}
                  onChange={(e) => setIsPreOrder(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                Pre-order product
              </label>
              {isPreOrder && (
                <label className="block sm:col-span-2">
                  <span className={labelCls}>Pre-order notice</span>
                  <input
                    value={preOrderNotice}
                    onChange={(e) => setPreOrderNotice(e.target.value)}
                    className={inputCls}
                  />
                </label>
              )}
            </div>
          </section>

          {/* Images */}
          <section className="rounded-2xl border border-zinc-100 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-zinc-900">Images</h2>
            <ImageListField
              label="Gallery images"
              value={images}
              onChange={setImages}
              hint="The first image is the one shown on product cards (★ promotes an image to first place). Max 5MB, PNG, JPEG, GIF, WebP or AVIF."
            />
          </section>

          {/* Variants */}
          <section className="rounded-2xl border border-zinc-100 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">Variants</h2>
              <button
                type="button"
                onClick={addVariant}
                className="h-8 rounded border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
              >
                + Add variant
              </button>
            </div>
            <p className="mb-3 text-xs text-zinc-400">
              Selectable options (e.g. shade or size). Leave empty for a
              single-option product. Label, value, SKU and price may be left
              blank — the value then falls back to the product name, the SKU is
              generated, and the price uses the product price.
            </p>
            {variants.length === 0 ? (
              <p className="text-sm text-zinc-500">No variants.</p>
            ) : (
              <div className="space-y-3">
                {variants.map((v, i) => (
                  <div
                    key={i}
                    className="space-y-3 rounded-lg border border-zinc-100 bg-zinc-50/60 p-3"
                  >
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="block">
                        <span className={labelCls}>Label (optional)</span>
                        <input
                          value={v.optionLabel}
                          onChange={(e) =>
                            updateVariant(i, { optionLabel: e.target.value })
                          }
                          placeholder="Shade"
                          className={inputCls}
                        />
                      </label>
                      <label className="block">
                        <span className={labelCls}>Value (optional)</span>
                        <input
                          value={v.optionValue}
                          onChange={(e) =>
                            updateVariant(i, { optionValue: e.target.value })
                          }
                          placeholder="01 Rose"
                          className={inputCls}
                        />
                      </label>
                      <label className="block">
                        <span className={labelCls}>SKU (optional)</span>
                        <input
                          value={v.sku}
                          onChange={(e) =>
                            updateVariant(i, { sku: e.target.value })
                          }
                          placeholder="Auto"
                          className={inputCls}
                        />
                      </label>
                      <label className="block">
                        <span className={labelCls}>
                          Price ({CURRENCY_SYMBOL}, optional)
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={v.price}
                          onChange={(e) =>
                            updateVariant(i, { price: e.target.value })
                          }
                          className={inputCls}
                        />
                      </label>
                      <label className="block">
                        <span className={labelCls}>
                          Intl price ({CURRENCY_SYMBOL}, optional)
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={v.globalPrice}
                          onChange={(e) =>
                            updateVariant(i, { globalPrice: e.target.value })
                          }
                          className={inputCls}
                        />
                      </label>
                      <label className="block">
                        <span className={labelCls}>Stock</span>
                        <input
                          type="number"
                          min="0"
                          value={v.stock}
                          onChange={(e) =>
                            updateVariant(i, {
                              stock: Number(e.target.value) || 0,
                            })
                          }
                          className={inputCls}
                        />
                      </label>
                      <label className="flex items-center gap-1.5 pb-2 text-sm text-zinc-600">
                        <input
                          type="checkbox"
                          checked={v.isActive}
                          onChange={(e) =>
                            updateVariant(i, { isActive: e.target.checked })
                          }
                          className="h-4 w-4 rounded border-zinc-300"
                        />
                        Active
                      </label>
                      <button
                        type="button"
                        onClick={() => removeVariant(i)}
                        className="h-9 rounded px-2 text-sm text-rose-600 hover:bg-rose-50"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="flex flex-wrap items-start gap-4">
                      <div className="min-w-[300px] flex-1">
                        <ImageListField
                          label="Option images (optional)"
                          value={v.images}
                          onChange={(images) => updateVariant(i, { images })}
                          hint="Added to the product gallery; the first image is shown while this option is selected (★ promotes one)."
                        />
                      </div>
                      <label className="block">
                        <span className={labelCls}>Swatch colour</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            aria-label="Swatch colour"
                            value={
                              /^#[0-9a-fA-F]{6}$/.test(v.color)
                                ? v.color
                                : "#ffffff"
                            }
                            onChange={(e) =>
                              updateVariant(i, { color: e.target.value })
                            }
                            className="h-9 w-10 cursor-pointer rounded border border-zinc-200 bg-white p-1"
                          />
                          <input
                            value={v.color}
                            onChange={(e) =>
                              updateVariant(i, { color: e.target.value })
                            }
                            placeholder="#faddc3"
                            className={inputCls}
                          />
                        </div>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* SEO */}
          <section className="rounded-2xl border border-zinc-100 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-zinc-900">SEO</h2>
            <div className="grid gap-4">
              <label className="block">
                <span className={labelCls}>SEO title</span>
                <input
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>SEO description</span>
                <textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-900 outline-none focus:border-point-500"
                />
              </label>
            </div>
          </section>
        </>
      )}

      {formTab === "content" && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <section className="rounded-2xl border border-zinc-100 bg-white p-5">
            <h2 className="mb-1 text-sm font-semibold text-zinc-900">
              DETAIL tab content
            </h2>
            <p className="mb-4 text-xs text-zinc-500">
              Blocks render in order on the product page&apos;s DETAIL tab. Text
              formatting is sanitized on save.
            </p>
            <BlockBuilder blocks={blocks} onChange={setBlocks} />
          </section>
          <section className="lg:sticky lg:top-6 lg:self-start">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Preview
            </p>
            <div className="rounded-2xl border border-zinc-100 bg-white p-5">
              {activeBlocks.length > 0 ? (
                <ProductBlocks blocks={activeBlocks} />
              ) : (
                <p className="py-10 text-center text-sm text-zinc-400">
                  Add a block to see the preview.
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {formTab === "info" && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-zinc-100 bg-white p-5">
              <h2 className="mb-1 text-sm font-semibold text-zinc-900">
                INFO tab
              </h2>
              <p className="mb-4 text-xs text-zinc-500">
                These sections start from the storewide INFO content. Uncheck
                one to hide it on this product, or add your own. Leaving the
                list empty falls back to the storewide content.
              </p>
              <InfoRowsEditor
                rows={infoRows}
                onChange={setInfoRows}
                showVisibility
                emptyHint="No sections yet — add one, or leave empty to use the storewide content."
              />
            </section>
            <section className="rounded-2xl border border-zinc-100 bg-white p-5">
              <h2 className="mb-1 text-sm font-semibold text-zinc-900">
                Product Info (under Buy Now)
              </h2>
              <p className="mb-4 text-xs text-zinc-500">
                A two-column card under the Buy Now button on this product only
                — one row per label and value. It is separate from the INFO tab
                above and is hidden while the list is empty.
              </p>
              <InfoRowsEditor
                rows={buyInfoRows}
                onChange={setBuyInfoRows}
                headingPlaceholder="Label (e.g. PAYMENT & BILLING)"
                bodyPlaceholder="Value text…"
                addLabel="+ Add row"
                emptyHint="No rows yet — add one, or leave empty to hide the card."
              />
            </section>
          </div>
          <section className="lg:sticky lg:top-6 lg:self-start">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Preview
            </p>
            <div className="rounded-2xl border border-zinc-100 bg-white p-5">
              {visibleInfoRows.length > 0 ? (
                <div className="space-y-6">
                  {visibleInfoRows.map((row, i) => (
                    <div key={i}>
                      {row.heading && (
                        <h3 className="mb-1 text-sm font-semibold text-[#222]">
                          {row.heading}
                        </h3>
                      )}
                      <p className="whitespace-pre-line text-sm leading-relaxed text-[#555]">
                        {row.body}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-zinc-400">
                  Nothing will show in the INFO tab.
                </p>
              )}
            </div>

            {buyInfoRows.filter((r) => r.heading || r.body).length > 0 && (
              <>
                <p className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Buy Now card
                </p>
                <div className="rounded-2xl border border-zinc-100 bg-white p-5">
                  <p className="text-sm font-semibold text-zinc-900">
                    Product Info
                  </p>
                  <dl className="mt-2">
                    {buyInfoRows
                      .filter((r) => r.heading || r.body)
                      .map((row, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-[85px_minmax(0,1fr)] gap-x-3 border-b border-[#f2f2f2] py-2.5 last:border-b-0"
                        >
                          <dt className="text-sm leading-6 text-[#aaa]">
                            {row.heading}
                          </dt>
                          <dd className="text-sm leading-6 whitespace-pre-line text-[#333]">
                            {row.body}
                          </dd>
                        </div>
                      ))}
                  </dl>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {formTab === "reviews" && (
        <section className="rounded-2xl border border-zinc-100 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">Reviews</h2>
          <ProductReviewsManager reviews={reviews ?? []} />
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded bg-point-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
        >
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create product"}
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
            : "You'll be taken to the edit page after creating."}
        </span>
      </div>
    </form>
  );
}
