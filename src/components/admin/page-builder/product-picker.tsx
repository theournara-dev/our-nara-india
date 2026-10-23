"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { inputCls, labelCls } from "@/components/admin/field-styles";
import { ADMIN_PRODUCT_SELECTED_LIMIT } from "@/lib/admin-product-search";

type ProductHit = {
  slug: string;
  name: string;
  image: string;
  brandSlug: string;
  brandName: string;
  isPreOrder: boolean;
  summary?: string;
};

type SearchResponse = {
  products: ProductHit[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  selected: ProductHit[];
};

async function searchProducts(
  params: {
    q: string;
    brand: string;
    category: string;
    page: number;
    selected: string[];
  },
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.brand) search.set("brand", params.brand);
  if (params.category) search.set("category", params.category);
  search.set("page", String(params.page));
  if (params.selected.length) {
    search.set("selected", params.selected.join(","));
  }

  const response = await fetch(`/api/admin/products/search?${search}`, {
    signal,
  });
  if (!response.ok) throw new Error("Could not load products.");
  return (await response.json()) as SearchResponse;
}

/**
 * Server-searched product picker for the page builder. Unlike the small
 * client-side lists, it pages through every active product, so brands with
 * thousands of products stay pickable.
 */
export function ProductPicker({
  value,
  onChange,
  brands,
  categories,
}: {
  value: string[];
  onChange: (slugs: string[]) => void;
  brands: { slug: string; name: string }[];
  categories: { slug: string; name: string }[];
}) {
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [items, setItems] = useState<ProductHit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const [known, setKnown] = useState<Record<string, ProductHit>>({});

  // The current selection labels choices that are outside the result page.
  // A ref keeps it out of the search effect's dependencies, so ticking a box
  // does not refetch the list.
  const selectedRef = useRef(value);
  useEffect(() => {
    selectedRef.current = value;
  }, [value]);
  const moreController = useRef<AbortController | null>(null);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = query.trim();
      if (next !== term) setTerm(next);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, term]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    moreController.current?.abort();
    moreController.current = null;
    loadingMoreRef.current = false;
    /* eslint-disable react-hooks/set-state-in-effect -- a new query starts here and the old rows must not linger */
    setLoading(true);
    setLoadingMore(false);
    setError("");
    setLoadError("");
    setItems([]);
    setTotal(0);
    setHasMore(false);
    /* eslint-enable react-hooks/set-state-in-effect */

    searchProducts(
      {
        q: term,
        brand,
        category,
        page: 1,
        selected: selectedRef.current.slice(0, ADMIN_PRODUCT_SELECTED_LIMIT),
      },
      controller.signal,
    )
      .then((data) => {
        if (!active) return;
        setItems(data.products);
        setTotal(data.total);
        setHasMore(data.hasMore);
        setPage(1);
        setKnown((prev) => {
          const next = { ...prev };
          for (const product of [...data.products, ...data.selected]) {
            next[product.slug] = product;
          }
          return next;
        });
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Could not load products.",
        );
        setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
      moreController.current?.abort();
      moreController.current = null;
    };
  }, [term, brand, category, retry]);

  function toggle(slug: string) {
    onChange(
      value.includes(slug)
        ? value.filter((s) => s !== slug)
        : [...value, slug],
    );
  }

  async function loadMore() {
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    const controller = new AbortController();
    moreController.current = controller;
    setLoadingMore(true);
    setLoadError("");
    try {
      const data = await searchProducts(
        {
          q: term,
          brand,
          category,
          page: page + 1,
          selected: [],
        },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setItems((prev) => [...prev, ...data.products]);
      setTotal(data.total);
      setPage(page + 1);
      setHasMore(data.hasMore);
      setKnown((prev) => {
        const next = { ...prev };
        for (const product of data.products) next[product.slug] = product;
        return next;
      });
    } catch {
      if (!controller.signal.aborted) {
        setLoadError("Could not load more products.");
      }
    } finally {
      if (moreController.current === controller) {
        moreController.current = null;
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }

  const selected = new Set(value);
  const selectedSlugs = [...selected];

  return (
    <div>
      <span className={labelCls}>Products</span>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search all products by name, slug or brand…"
        className={inputCls}
        aria-label="Search all products"
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <select
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          className={inputCls}
          aria-label="Filter products by brand"
        >
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={inputCls}
          aria-label="Filter products by category"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {selectedSlugs.length > 0 && (
        <div className="mt-2 rounded border border-zinc-200">
          <div className="border-b border-zinc-100 px-2 py-1 text-xs font-medium text-zinc-500">
            Selected ({selectedSlugs.length})
          </div>
          <div className="max-h-28 overflow-y-auto py-1">
            {selectedSlugs.map((slug) => {
              const product = known[slug];
              return (
                <div
                  key={slug}
                  className="flex items-center gap-2 px-2 py-1 text-sm text-zinc-700"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {product?.name ?? slug}
                  </span>
                  {product && (
                    <span className="shrink-0 text-xs text-zinc-400">
                      {product.brandName}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => toggle(slug)}
                    aria-label={`Remove ${product?.name ?? slug}`}
                    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-2 max-h-56 overflow-y-auto rounded border border-zinc-200">
        {loading ? (
          <p className="px-2 py-2 text-xs text-zinc-400">
            Searching all products…
          </p>
        ) : error ? (
          <div className="px-2 py-2 text-xs text-red-600">
            {error}{" "}
            <button
              type="button"
              onClick={() => setRetry((v) => v + 1)}
              className="font-medium underline"
            >
              Try again
            </button>
          </div>
        ) : items.length === 0 ? (
          <p className="px-2 py-2 text-xs text-zinc-400">
            No products match these filters.
          </p>
        ) : (
          items.map((product) => (
            <label
              key={product.slug}
              className="flex cursor-pointer items-center gap-2 px-2 py-1.5 hover:bg-zinc-50"
            >
              <input
                type="checkbox"
                checked={selected.has(product.slug)}
                onChange={() => toggle(product.slug)}
                className="h-4 w-4 shrink-0 rounded border-zinc-300 accent-point-500"
              />
              {product.image ? (
                <Image
                  src={product.image}
                  alt=""
                  width={40}
                  height={24}
                  unoptimized
                  className="h-6 w-10 shrink-0 rounded object-cover"
                />
              ) : (
                <span className="h-6 w-10 shrink-0 rounded bg-zinc-100" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-zinc-700">
                  {product.name}
                </span>
                <span className="block truncate text-xs text-zinc-400">
                  {product.brandName}
                  {product.isPreOrder ? " · Pre-order" : ""}
                </span>
              </span>
            </label>
          ))
        )}
      </div>

      {!loading && !error && hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="mt-1 inline-flex h-8 w-full items-center justify-center rounded border border-zinc-200 text-xs font-medium text-zinc-600 transition-colors hover:border-point-500 hover:text-point-500 disabled:opacity-60"
        >
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      )}
      {loadError && (
        <p className="mt-1 text-xs text-red-600">
          {loadError}{" "}
          <button
            type="button"
            onClick={loadMore}
            className="font-medium underline"
          >
            Try again
          </button>
        </p>
      )}
      <span className="mt-1 block text-xs text-zinc-400">
        {selectedSlugs.length} selected
        {!loading && !error
          ? ` · ${total} matching product${total === 1 ? "" : "s"}`
          : ""}
      </span>
    </div>
  );
}
