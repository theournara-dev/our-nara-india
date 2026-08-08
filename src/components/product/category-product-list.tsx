"use client";

import { useMemo, useState } from "react";
import { ProductGrid } from "@/components/product/product-grid";
import type { ProductCard } from "@/data/products";

interface CategoryProductListProps {
  products: ProductCard[];
  /** Columns on large screens (default 5 for category pages). */
  columns?: 3 | 4 | 5;
}

type SortKey =
  "new" | "name" | "lowest" | "highest" | "manufacturer" | "review";

/** Sort options matching the original category/brand toolbar. */
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "new", label: "New Item" },
  { key: "name", label: "Product Name" },
  { key: "lowest", label: "Lowest Price" },
  { key: "highest", label: "Highest Price" },
  { key: "manufacturer", label: "Manufacture Company" },
  { key: "review", label: "Product Review" },
];

/**
 * Category product list mirroring the original toolbar: a sort dropdown and a
 * "N items were found." count above the grid. Sorting is local (temporary
 * static catalog). No top/bottom borders on the toolbar.
 */
export function CategoryProductList({
  products,
  columns = 5,
}: CategoryProductListProps) {
  const [sort, setSort] = useState<SortKey>("new");

  const sorted = useMemo(() => {
    const arr = [...products];
    switch (sort) {
      case "name":
        return arr.sort((a, b) => a.name.localeCompare(b.name));
      case "lowest":
        return arr.sort((a, b) => a.priceCents - b.priceCents);
      case "highest":
        return arr.sort((a, b) => b.priceCents - a.priceCents);
      case "manufacturer":
        return arr.sort((a, b) => a.brand.name.localeCompare(b.brand.name));
      case "new":
      case "review":
      default:
        return arr;
    }
  }, [products, sort]);

  return (
    <div>
      <div className="flex items-center justify-between py-3">
        <span className="text-sm text-[#555]">
          <strong className="font-semibold text-[#222]">
            {products.length}
          </strong>{" "}
          item{products.length !== 1 ? "s" : ""}{" "}
          {products.length === 1 ? "was" : "were"} found.
        </span>
        <label className="flex items-center gap-2">
          <span className="text-xs text-[#888]">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="h-9 cursor-pointer rounded border border-[#e9e9e9] bg-white px-2 text-sm text-[#222] outline-none focus:border-point-500"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6">
        <ProductGrid products={sorted} columns={columns} />
      </div>
    </div>
  );
}
