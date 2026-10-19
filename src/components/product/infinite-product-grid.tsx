"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProductGrid } from "@/components/product/product-grid";
import type { ProductCard } from "@/data/products";
import type { ProductListingPage } from "@/lib/product-listing";
import type { SiteVersion } from "@/lib/site-version";

/**
 * Search results with the same endless-scroll behaviour as the category and
 * brand listings. The total is rendered by the server page; this component only
 * appends batches and never changes the count.
 */
export function InfiniteProductGrid({
  initialProducts,
  initialTotal,
  initialNextPage,
  query,
  version,
  columns = 4,
}: {
  initialProducts: ProductCard[];
  initialTotal: number;
  initialNextPage: number | null;
  query: string;
  version?: SiteVersion;
  columns?: 3 | 4 | 5;
}) {
  const [products, setProducts] = useState<ProductCard[]>(initialProducts);
  const [nextPage, setNextPage] = useState<number | null>(initialNextPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const requestRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const fetchNext = useCallback(
    async (page: number) => {
      const requestId = ++requestRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          q: query,
          page: String(page),
        });
        if (version) params.set("version", version);
        const response = await fetch(`/api/products/listing?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error ?? "Could not load more results.");
        }
        const data = (await response.json()) as ProductListingPage;
        if (requestId !== requestRef.current) return;
        setProducts((previous) => {
          const seen = new Set(previous.map((product) => product.id));
          return [
            ...previous,
            ...data.products.filter((product) => !seen.has(product.id)),
          ];
        });
        setNextPage(data.hasMore ? data.page + 1 : null);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(
          err instanceof Error ? err.message : "Could not load more results.",
        );
      } finally {
        if (requestId === requestRef.current) setLoading(false);
      }
    },
    [query, version],
  );

  const loadMore = useCallback(() => {
    if (loading || error || nextPage == null) return;
    void fetchNext(nextPage);
  }, [loading, error, nextPage, fetchNext]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || nextPage == null || loading || error) return;
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nextPage, loading, error, loadMore]);

  function retry() {
    if (nextPage == null) return;
    void fetchNext(nextPage);
  }

  return (
    <div>
      <ProductGrid products={products} columns={columns} />

      {nextPage != null && !error && (
        <div className="mt-10 text-center">
          <div ref={sentinelRef} aria-hidden className="h-px" />
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-[#6f2dbd] bg-white px-8 text-sm font-medium text-[#6f2dbd] transition-colors duration-300 hover:bg-[#6f2dbd] hover:text-white disabled:opacity-60"
          >
            {loading
              ? "Loading…"
              : `Load more${
                  initialTotal > products.length
                    ? ` (${initialTotal - products.length})`
                    : ""
                }`}
          </button>
        </div>
      )}

      {loading && (
        <p className="mt-3 text-center text-xs text-[#888]">
          Loading more results…
        </p>
      )}

      {error && (
        <div className="mt-6 rounded border border-red-100 bg-red-50 px-4 py-3 text-center text-sm text-red-600">
          {error}{" "}
          <button
            type="button"
            onClick={retry}
            className="cursor-pointer font-semibold underline"
          >
            Try again
          </button>
        </div>
      )}

      {nextPage == null && !loading && !error && products.length > 0 && (
        <p className="mt-10 text-center text-xs text-[#999]">
          All {initialTotal} results shown.
        </p>
      )}
    </div>
  );
}
