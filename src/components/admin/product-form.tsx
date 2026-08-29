"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/slug";
import { isValidImageUrl } from "@/lib/blob";
import { notify } from "@/lib/toast";
import {
  createProduct,
  updateProduct,
  createBrand,
  createCategory,
  type ProductInput,
} from "@/app/admin/products/actions";

type BrandOption = { id: string; name: string };
type CategoryOption = { id: string; name: string };

type VariantDraft = {
  id?: string;
  optionLabel: string;
  optionValue: string;
  sku: string;
  price: string; // rupees, optional
  stock: number;
  isActive: boolean;
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
      stock: number;
      isActive: boolean;
    }[];
  } | null;
  brands: BrandOption[];
  categories: CategoryOption[];
};

const inputCls =
  "h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500";
const labelCls = "mb-1 block text-xs font-medium text-zinc-500";

function toRupees(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(/\.00$/, "");
}

export function ProductForm({
  product,
  brands: initialBrands,
  categories: initialCategories,
  backHref,
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
      stock: v.stock,
      isActive: v.isActive,
    })),
  );

  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [showNewBrand, setShowNewBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [creatingBrand, setCreatingBrand] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  function onNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function addImageUrl() {
    const value = urlInput.trim();
    if (!value) return;
    if (!isValidImageUrl(value)) {
      notify.error(
        "Invalid image URL",
        "Use a public http(s) image URL ending in .png, .jpg, .gif, .webp or .avif.",
      );
      return;
    }
    setImages((prev) => [...prev, value]);
    setUrlInput("");
  }

  async function onFileChange(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const toastId = notify.loading("Uploading image…");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Upload failed");
      }
      setImages((prev) => [...prev, data.url!]);
      notify.success(toastId, "Image uploaded");
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
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function onCreateBrand(e: React.FormEvent) {
    e.preventDefault();
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

  async function onCreateCategory(e: React.FormEvent) {
    e.preventDefault();
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
        stock: 0,
        isActive: true,
      },
    ]);
  }

  function removeVariant(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
        optionValue: v.optionValue.trim(),
        sku: v.sku.trim(),
        priceCents: v.price
          ? Math.round((parseFloat(v.price) || 0) * 100)
          : undefined,
        stock: v.stock,
        isActive: v.isActive,
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

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Basic info */}
      <section className="rounded-2xl border border-zinc-100 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">Basic info</h2>
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
              <form onSubmit={onCreateBrand} className="mt-2 flex gap-2">
                <input
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="Brand name"
                  autoFocus
                  className={inputCls}
                />
                <button
                  type="submit"
                  disabled={creatingBrand}
                  className="h-9 shrink-0 rounded bg-point-500 px-3 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {creatingBrand ? "…" : "Create"}
                </button>
              </form>
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
              <form onSubmit={onCreateCategory} className="mt-2 flex gap-2">
                <input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name"
                  autoFocus
                  className={inputCls}
                />
                <button
                  type="submit"
                  disabled={creatingCategory}
                  className="h-9 shrink-0 rounded bg-point-500 px-3 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {creatingCategory ? "…" : "Create"}
                </button>
              </form>
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
        <h2 className="mb-4 text-sm font-semibold text-zinc-900">Pricing</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Price (₹)</span>
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
            <span className={labelCls}>Compare-at price (₹, optional)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={compareAt}
              onChange={(e) => setCompareAt(e.target.value)}
              className={inputCls}
            />
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
        {images.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-3">
            {images.map((src, i) => (
              <div key={i} className="relative">
                <Image
                  src={src}
                  alt={`Image ${i + 1}`}
                  width={72}
                  height={72}
                  unoptimized
                  className="h-18 w-18 rounded border border-zinc-200 object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-xs text-white hover:bg-zinc-700"
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste an image URL…"
            className="h-9 min-w-0 flex-1 rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500"
          />
          <button
            type="button"
            onClick={addImageUrl}
            className="h-9 rounded border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
          >
            Add URL
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="h-9 rounded border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Upload file"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp,image/avif"
            className="hidden"
            onChange={(e) => onFileChange(e.target.files?.[0])}
          />
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          Max 5MB. PNG, JPEG, GIF, WebP or AVIF.
        </p>
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
          single-option product.
        </p>
        {variants.length === 0 ? (
          <p className="text-sm text-zinc-500">No variants.</p>
        ) : (
          <div className="space-y-3">
            {variants.map((v, i) => (
              <div
                key={i}
                className="flex flex-wrap items-end gap-2 rounded-lg border border-zinc-100 bg-zinc-50/60 p-3"
              >
                <label className="block">
                  <span className={labelCls}>Label</span>
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
                  <span className={labelCls}>Value</span>
                  <input
                    value={v.optionValue}
                    onChange={(e) =>
                      updateVariant(i, { optionValue: e.target.value })
                    }
                    required
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className={labelCls}>SKU</span>
                  <input
                    value={v.sku}
                    onChange={(e) => updateVariant(i, { sku: e.target.value })}
                    required
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className={labelCls}>Price (₹, optional)</span>
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
                  <span className={labelCls}>Stock</span>
                  <input
                    type="number"
                    min="0"
                    value={v.stock}
                    onChange={(e) =>
                      updateVariant(i, { stock: Number(e.target.value) || 0 })
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
