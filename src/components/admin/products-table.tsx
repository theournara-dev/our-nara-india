"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { notify } from "@/lib/toast";
import { formatMoney } from "@/lib/money";
import { StoreFlagToggles } from "@/components/admin/store-flag-toggles";
import {
  toggleProductActive,
  softDeleteProduct,
  hardDeleteProduct,
  setProductStoreFlag,
} from "@/app/admin/products/actions";
import { assignSubcategories } from "@/app/admin/products/subcategory-actions";
import { ProductRowActions } from "@/app/admin/products/row-actions";

export interface AdminProductRow {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  brandName: string;
  categoryName: string;
  priceCents: number;
  globalPriceCents: number | null;
  currency: string;
  stock: number;
  isActive: boolean;
  isPreOrder: boolean;
  buyNowEnabled: boolean;
  globalIsActive: boolean;
  globalIsPreOrder: boolean;
  globalBuyNowEnabled: boolean;
  /** Mid-level categories the product sits in. */
  subcategories: { id: string; name: string }[];
}

export interface SubcategoryOption {
  id: string;
  name: string;
  /** Top-level category it belongs to, for the grouped picker. */
  parentName: string;
}

const selectCls =
  "h-9 rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500";

/**
 * The products table. Rows carry the per-store flag toggles and the row
 * actions; the header checkbox and the bar above the table bulk-assign
 * mid-level categories, which is how the client maps a catalog at scale.
 */
export function ProductsTable({
  rows,
  filterQuery,
  subcategoryOptions,
}: {
  rows: AdminProductRow[];
  filterQuery: string;
  subcategoryOptions: SubcategoryOption[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [pending, startTransition] = useTransition();

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const groupedOptions = useMemo(() => {
    const groups = new Map<string, SubcategoryOption[]>();
    for (const option of subcategoryOptions) {
      const list = groups.get(option.parentName) ?? [];
      list.push(option);
      groups.set(option.parentName, list);
    }
    return [...groups.entries()];
  }, [subcategoryOptions]);

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  function runBulk(mode: "add" | "remove" | "clear") {
    const ids = [...selected];
    if (ids.length === 0) {
      notify.error("Bulk assign", "Tick at least one product first.");
      return;
    }
    if (mode !== "clear" && !bulkCategoryId) {
      notify.error("Bulk assign", "Choose a subcategory first.");
      return;
    }
    startTransition(async () => {
      const toastId = notify.loading("Updating subcategories…");
      const result = await assignSubcategories(
        ids,
        mode === "clear" ? null : bulkCategoryId,
        mode,
      );
      if (!result.ok) {
        notify.error(toastId, "Bulk assign", result.message);
        return;
      }
      notify.success(
        toastId,
        "Subcategories updated",
        `${result.changed} change${result.changed === 1 ? "" : "s"} across ${ids.length} product${ids.length === 1 ? "" : "s"}.`,
      );
      setSelected(new Set());
    });
  }

  return (
    <div>
      {/* Bulk bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-100 bg-white px-3 py-2">
        <span className="text-sm text-zinc-600">
          {selected.size === 0
            ? "Tick products to assign subcategories in bulk"
            : `${selected.size} selected`}
        </span>
        <select
          value={bulkCategoryId}
          onChange={(e) => setBulkCategoryId(e.target.value)}
          className={selectCls}
          aria-label="Subcategory to assign"
        >
          <option value="">Choose subcategory…</option>
          {groupedOptions.map(([parent, options]) => (
            <optgroup key={parent} label={parent}>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          type="button"
          onClick={() => runBulk("add")}
          disabled={pending}
          className="inline-flex h-9 items-center rounded bg-point-500 px-3 text-sm font-semibold text-white hover:bg-point-600 disabled:opacity-60"
        >
          Assign
        </button>
        <button
          type="button"
          onClick={() => runBulk("remove")}
          disabled={pending}
          className="inline-flex h-9 items-center rounded border border-zinc-200 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
        >
          Remove
        </button>
        <button
          type="button"
          onClick={() => runBulk("clear")}
          disabled={pending}
          className="inline-flex h-9 items-center rounded px-3 text-sm text-zinc-500 hover:text-rose-600 disabled:opacity-60"
        >
          Clear all
        </button>
        <Link
          href="/admin/products/import"
          className="ml-auto text-sm font-medium text-point-600 hover:text-point-700"
        >
          Import CSV →
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-100 bg-white">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-[11px] uppercase tracking-wide text-zinc-400">
              <th className="w-8 px-2 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all products on this page"
                  className="h-4 w-4 accent-point-500"
                />
              </th>
              <th className="px-2 py-2 font-medium">Product</th>
              <th className="px-2 py-2 font-medium">Brand</th>
              <th className="px-2 py-2 font-medium">Category</th>
              <th className="px-2 py-2 font-medium">Price</th>
              <th className="px-2 py-2 font-medium">Stock</th>
              <th className="px-2 py-2 font-medium">
                Stores
                <span className="ml-1 font-normal normal-case text-zinc-300">
                  IN · GL
                </span>
              </th>
              <th className="px-2 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-2 py-8 text-center text-sm text-zinc-500"
                >
                  No products found.
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr key={p.id} className="border-b border-zinc-50 last:border-0">
                  <td className="px-2 py-1.5 align-top">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleRow(p.id)}
                      aria-label={`Select ${p.name}`}
                      className="h-4 w-4 accent-point-500"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      {p.image ? (
                        <Image
                          src={p.image}
                          alt={p.name}
                          width={32}
                          height={32}
                          unoptimized
                          loading="lazy"
                          className="h-8 w-8 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 shrink-0 rounded bg-zinc-100" />
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/admin/products/${p.id}/edit${filterQuery}`}
                          className="block max-w-[200px] truncate text-sm font-medium text-zinc-900 hover:text-point-500"
                        >
                          {p.name}
                        </Link>
                        <span className="text-[11px] text-zinc-400">
                          {p.slug}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-sm text-zinc-600">
                    {p.brandName}
                  </td>
                  <td className="px-2 py-1.5 text-sm text-zinc-600">
                    <div>{p.categoryName}</div>
                    {/* Mid-level categories, so a missing assignment is visible
                        right in the list. */}
                    {p.subcategories.length > 0 ? (
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {p.subcategories.map((s) => (
                          <span
                            key={s.id}
                            className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600"
                          >
                            {s.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-amber-600">
                        No subcategory
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-sm text-zinc-900">
                    <div>
                      {formatMoney(p.priceCents, p.currency, {
                        convert: false,
                      })}
                    </div>
                    {/* Second line so admins can spot products without a
                        dedicated international price at a glance. */}
                    <div className="text-[11px] text-zinc-400">
                      {p.globalPriceCents != null
                        ? `Intl ${formatMoney(p.globalPriceCents, p.currency, { convert: false })}`
                        : "Intl —"}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-sm text-zinc-600">
                    {p.stock}
                  </td>
                  <td className="px-2 py-1.5">
                    <StoreFlagToggles
                      id={p.id}
                      name={p.name}
                      onChange={setProductStoreFlag}
                      flags={{
                        local: {
                          show: p.isActive,
                          preorder: p.isPreOrder,
                          buynow: p.buyNowEnabled,
                        },
                        global: {
                          show: p.globalIsActive,
                          preorder: p.globalIsPreOrder,
                          buynow: p.globalBuyNowEnabled,
                        },
                      }}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <ProductRowActions
                      id={p.id}
                      isActive={p.isActive}
                      editHref={`/admin/products/${p.id}/edit${filterQuery}`}
                      toggle={toggleProductActive}
                      remove={softDeleteProduct}
                      hardDelete={hardDeleteProduct}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
