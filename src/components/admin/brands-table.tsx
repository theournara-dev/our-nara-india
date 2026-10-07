"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { notify } from "@/lib/toast";
import { deleteBrand, toggleBrandActive } from "@/app/admin/brands/actions";

export interface AdminBrandRow {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  productCount: number;
}

/**
 * Brand list for the admin: who is on the storefront, how many products each
 * one carries, and a delete for the ones nothing points at.
 */
export function BrandsTable({ brands }: { brands: AdminBrandRow[] }) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<AdminBrandRow | null>(null);
  const [pending, startTransition] = useTransition();

  function onToggle(row: AdminBrandRow) {
    startTransition(async () => {
      const res = await toggleBrandActive(row.id, !row.isActive);
      if (!res.ok) {
        notify.error("Update failed", res.message);
        return;
      }
      notify.success(row.isActive ? "Brand hidden" : "Brand visible", row.name);
      router.refresh();
    });
  }

  function onDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    startTransition(async () => {
      const tid = notify.loading("Deleting brand…");
      const res = await deleteBrand(target.id);
      if (!res.ok) {
        notify.error(tid, "Could not delete", res.message);
        setDeleteTarget(null);
        return;
      }
      notify.success(tid, "Brand deleted", target.name);
      setDeleteTarget(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/60 text-left text-xs uppercase tracking-wide text-zinc-400">
              <th className="px-4 py-3 font-medium">Brand</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Products</th>
              <th className="px-4 py-3 font-medium">On storefront</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {brands.map((brand) => (
              <tr
                key={brand.id}
                className="border-b border-zinc-50 last:border-0"
              >
                <td className="px-4 py-3 font-medium text-zinc-900">
                  {brand.name}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                  {brand.slug}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {brand.productCount}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onToggle(brand)}
                    className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                      brand.isActive
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                    }`}
                    title={
                      brand.isActive
                        ? "Hide from the storefront"
                        : "Show on the storefront"
                    }
                  >
                    {brand.isActive ? "Visible" : "Hidden"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setDeleteTarget(brand)}
                    className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {brands.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm text-zinc-400"
                >
                  No brands yet. Add one from the product form.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete ${deleteTarget?.name ?? "this brand"}?`}
        message={
          deleteTarget && deleteTarget.productCount > 0
            ? `${deleteTarget.name} still has ${deleteTarget.productCount} product${
                deleteTarget.productCount === 1 ? "" : "s"
              }. Move them to another brand first — or hide the brand instead.`
            : "This permanently removes the brand. Products that use it would lose it, so it is only allowed once none do."
        }
        confirmLabel="Delete"
        busy={pending}
        onConfirm={onDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
