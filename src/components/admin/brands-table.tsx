"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ImageField } from "@/components/admin/image-field";
import {
  deleteBrand,
  toggleBrandActive,
  updateBrand,
} from "@/app/admin/brands/actions";
import { notify } from "@/lib/toast";

export type BrandGroupKey = "ONLY_AT_OURNARA" | "NEW_LAUNCH";

export interface AdminBrandRow {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  productCount: number;
  logoUrl: string | null;
  group: BrandGroupKey | null;
}

const GROUP_LABELS: Record<BrandGroupKey, string> = {
  ONLY_AT_OURNARA: "Only At Ournara",
  NEW_LAUNCH: "New Launch",
};

/**
 * Brand list for the admin: who is on the storefront, how many products each
 * one carries, its /brands page image and group tab, and a delete for the ones
 * nothing points at.
 */
export function BrandsTable({ brands }: { brands: AdminBrandRow[] }) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<AdminBrandRow | null>(null);
  const [editTarget, setEditTarget] = useState<AdminBrandRow | null>(null);
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
              <th className="px-4 py-3 font-medium">Brands page</th>
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
                  <span className="flex items-center gap-3">
                    {brand.logoUrl ? (
                      <Image
                        src={brand.logoUrl}
                        alt=""
                        width={64}
                        height={32}
                        unoptimized
                        className="h-8 w-16 rounded border border-zinc-100 object-contain"
                      />
                    ) : (
                      <span className="flex h-8 w-16 items-center justify-center rounded border border-dashed border-zinc-200 text-[10px] text-zinc-300">
                        no image
                      </span>
                    )}
                    {brand.name}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                  {brand.slug}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {brand.productCount}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {brand.group ? (
                    GROUP_LABELS[brand.group]
                  ) : (
                    <span className="text-zinc-400">All only</span>
                  )}
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
                  <span className="inline-flex gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setEditTarget(brand)}
                      className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-point-50 hover:text-point-600 disabled:opacity-60"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setDeleteTarget(brand)}
                      className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </span>
                </td>
              </tr>
            ))}
            {brands.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-zinc-400"
                >
                  No brands yet. Add one from the product form.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editTarget && (
        <BrandEditDialog
          brand={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            router.refresh();
          }}
        />
      )}

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

/** The /brands page fields: the brand image and its curated group tab. */
function BrandEditDialog({
  brand,
  onClose,
  onSaved,
}: {
  brand: AdminBrandRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [logoUrl, setLogoUrl] = useState(brand.logoUrl ?? "");
  const [group, setGroup] = useState<"" | BrandGroupKey>(brand.group ?? "");
  const [saving, startTransition] = useTransition();

  function onSave() {
    startTransition(async () => {
      const tid = notify.loading("Saving brand…");
      const res = await updateBrand(brand.id, {
        logoUrl,
        group: group === "" ? null : group,
      });
      if (!res.ok) {
        notify.error(tid, "Could not save", res.message);
        return;
      }
      notify.success(tid, "Brand saved", brand.name);
      onSaved();
    });
  }

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto">
      <div
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm"
        onClick={saving ? undefined : onClose}
        aria-hidden
      />
      <div className="relative flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Edit ${brand.name}`}
          className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
        >
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-60"
          >
            ✕
          </button>
          <h3 className="pr-8 text-lg font-semibold text-zinc-900">
            {brand.name}
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            What the /brands page shows for this brand.
          </p>

          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-500">
                Group tab
              </span>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value as "" | BrandGroupKey)}
                className="h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500"
              >
                <option value="">No group (All tab only)</option>
                <option value="ONLY_AT_OURNARA">Only At Ournara</option>
                <option value="NEW_LAUNCH">New Launch</option>
              </select>
            </label>

            <ImageField
              label="Brand image (optional)"
              value={logoUrl}
              onChange={setLogoUrl}
              hint="Shown on the /brands grid tile; brands without one show their name."
            />
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-9 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="h-9 rounded-full bg-point-500 px-5 text-sm font-semibold text-white hover:bg-point-600 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
