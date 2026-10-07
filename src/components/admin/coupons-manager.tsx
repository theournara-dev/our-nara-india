"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  deleteCoupon,
  saveCoupon,
  toggleCouponActive,
} from "@/app/admin/coupons/actions";
import {
  couponConditions,
  describeCouponValue,
  type CouponRecord,
  type CouponScopeValue,
  type CouponSiteVersion,
  type CouponTypeValue,
} from "@/lib/coupons";
import { formatMoney } from "@/lib/money";
import { notify } from "@/lib/toast";

const inputCls =
  "h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500";
const labelCls = "mb-1 block text-xs font-medium text-zinc-500";
const saveBtnCls =
  "h-9 rounded bg-point-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60";

export type CouponTarget = { id: string; name: string };

export type AdminCouponRow = CouponRecord & {
  /** How many times the coupon was redeemed on paid orders. */
  redemptionCount: number;
};

type FormState = {
  id: string | null;
  code: string;
  title: string;
  description: string;
  type: CouponTypeValue;
  /** Percent for PERCENT coupons (as typed). */
  percent: string;
  /** Rupees for FIXED coupons (as typed). */
  amount: string;
  /** Rupees, optional. */
  minOrder: string;
  maxUses: string;
  perUserLimit: string;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
  siteVersion: CouponSiteVersion;
  firstPurchaseOnly: boolean;
  scope: CouponScopeValue;
  brandId: string;
  categoryId: string;
  productIds: string[];
};

const EMPTY_FORM: FormState = {
  id: null,
  code: "",
  title: "",
  description: "",
  type: "PERCENT",
  percent: "10",
  amount: "",
  minOrder: "",
  maxUses: "",
  perUserLimit: "",
  startsAt: "",
  expiresAt: "",
  isActive: true,
  siteVersion: "all",
  firstPurchaseOnly: false,
  scope: "ALL",
  brandId: "",
  categoryId: "",
  productIds: [],
};

function toRupees(cents: number | null): string {
  if (cents == null) return "";
  return String(cents / 100);
}

function toCents(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : null;
}

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formFromRow(row: AdminCouponRow): FormState {
  return {
    id: row.id,
    code: row.code,
    title: row.title ?? "",
    description: row.description ?? "",
    type: row.type,
    percent: row.type === "PERCENT" ? String(row.value) : "10",
    amount: row.type === "FIXED" ? toRupees(row.value) : "",
    minOrder: toRupees(row.minOrderCents),
    maxUses: row.maxUses == null ? "" : String(row.maxUses),
    perUserLimit: row.perUserLimit == null ? "" : String(row.perUserLimit),
    startsAt: toDateInput(row.startsAt),
    expiresAt: toDateInput(row.expiresAt),
    isActive: row.isActive,
    siteVersion: row.siteVersion,
    firstPurchaseOnly: row.firstPurchaseOnly,
    scope: row.scope,
    brandId: row.brandId ?? "",
    categoryId: row.categoryId ?? "",
    productIds: row.productIds,
  };
}

/**
 * Coupon manager: the list (with usage, store and status) and the editor for a
 * coupon's value, conditions and targets. Saving, toggling and deleting all go
 * through the admin actions in `src/app/admin/coupons/actions.ts`.
 */
export function CouponsManager({
  coupons,
  brands,
  categories,
  products,
}: {
  coupons: AdminCouponRow[];
  brands: CouponTarget[];
  categories: CouponTarget[];
  products: CouponTarget[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<AdminCouponRow | null>(null);

  const money = (cents: number) =>
    formatMoney(cents, "INR", { convert: false });

  function patch(next: Partial<FormState>) {
    setForm((prev) => (prev ? { ...prev, ...next } : prev));
  }

  function onSave() {
    if (!form) return;
    startTransition(async () => {
      const toastId = notify.loading("Saving coupon…");
      const res = await saveCoupon({
        id: form.id ?? undefined,
        code: form.code,
        title: form.title || undefined,
        description: form.description || undefined,
        type: form.type,
        value:
          form.type === "PERCENT"
            ? Math.round(Number.parseFloat(form.percent) || 0)
            : form.type === "FIXED"
              ? (toCents(form.amount) ?? 0)
              : 0,
        minOrderCents: toCents(form.minOrder),
        maxUses: form.maxUses ? Number.parseInt(form.maxUses, 10) || 0 : null,
        perUserLimit: form.perUserLimit
          ? Number.parseInt(form.perUserLimit, 10) || 0
          : null,
        startsAt: form.startsAt || undefined,
        expiresAt: form.expiresAt || undefined,
        isActive: form.isActive,
        siteVersion: form.siteVersion,
        firstPurchaseOnly: form.firstPurchaseOnly,
        scope: form.scope,
        brandId: form.brandId || undefined,
        categoryId: form.categoryId || undefined,
        productIds: form.productIds,
      });
      if (!res.ok) {
        notify.error(toastId, "Could not save", res.message);
        return;
      }
      notify.success(toastId, "Coupon saved", form.code.toUpperCase());
      setForm(null);
      router.refresh();
    });
  }

  function onToggle(row: AdminCouponRow) {
    startTransition(async () => {
      const res = await toggleCouponActive(row.id, !row.isActive);
      if (!res.ok) {
        notify.error("Update failed", res.message);
        return;
      }
      notify.success(row.isActive ? "Coupon hidden" : "Coupon live", row.code);
      router.refresh();
    });
  }

  function onDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    startTransition(async () => {
      const toastId = notify.loading("Deleting coupon…");
      const res = await deleteCoupon(target.id);
      if (!res.ok) {
        notify.error(toastId, "Could not delete", res.message);
        setDeleteTarget(null);
        return;
      }
      notify.success(toastId, "Coupon deleted", target.code);
      setDeleteTarget(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-zinc-900">Coupons</h1>
          <p className="text-sm text-zinc-500">
            {coupons.length} coupon{coupons.length === 1 ? "" : "s"}. Coupons
            appear on the couponzone page, and the ones that fit a cart are
            offered at checkout — first-order codes sit at the bottom of the
            cart.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setForm(EMPTY_FORM)}
          disabled={pending}
          className={saveBtnCls}
        >
          New coupon
        </button>
      </div>

      {form && (
        <section className="rounded-2xl border border-zinc-100 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">
            {form.id ? "Edit coupon" : "New coupon"}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className={labelCls}>Code</span>
              <input
                value={form.code}
                onChange={(e) => patch({ code: e.target.value })}
                placeholder="SAVE10"
                className={`${inputCls} font-mono uppercase`}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Title (shown on the card)</span>
              <input
                value={form.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="Welcome offer"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Store</span>
              <select
                value={form.siteVersion}
                onChange={(e) =>
                  patch({ siteVersion: e.target.value as CouponSiteVersion })
                }
                className={inputCls}
              >
                <option value="all">Both stores</option>
                <option value="local">India (local)</option>
                <option value="global">International (global)</option>
              </select>
            </label>
            <label className="block sm:col-span-2 lg:col-span-3">
              <span className={labelCls}>Description</span>
              <input
                value={form.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="10% off your first order"
                className={inputCls}
              />
            </label>

            {/* ── Value ─────────────────────────────────────────────────── */}
            <label className="block">
              <span className={labelCls}>Discount type</span>
              <select
                value={form.type}
                onChange={(e) =>
                  patch({ type: e.target.value as CouponTypeValue })
                }
                className={inputCls}
              >
                <option value="PERCENT">Percentage off</option>
                <option value="FIXED">Fixed amount off</option>
                <option value="SHIPPING">Free shipping</option>
              </select>
            </label>
            {form.type === "PERCENT" && (
              <label className="block">
                <span className={labelCls}>Percent off (1–100)</span>
                <input
                  inputMode="numeric"
                  value={form.percent}
                  onChange={(e) => patch({ percent: e.target.value })}
                  className={inputCls}
                />
              </label>
            )}
            {form.type === "FIXED" && (
              <label className="block">
                <span className={labelCls}>Amount off (₹)</span>
                <input
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => patch({ amount: e.target.value })}
                  className={inputCls}
                />
              </label>
            )}
            <label className="block">
              <span className={labelCls}>Minimum order (₹, optional)</span>
              <input
                inputMode="decimal"
                value={form.minOrder}
                onChange={(e) => patch({ minOrder: e.target.value })}
                placeholder="No minimum"
                className={inputCls}
              />
            </label>

            {/* ── Conditions ────────────────────────────────────────────── */}
            <label className="block">
              <span className={labelCls}>Applies to</span>
              <select
                value={form.scope}
                onChange={(e) =>
                  patch({ scope: e.target.value as CouponScopeValue })
                }
                className={inputCls}
              >
                <option value="ALL">Everything in the cart</option>
                <option value="BRAND">One brand</option>
                <option value="CATEGORY">One category</option>
                <option value="PRODUCT">Selected products</option>
              </select>
            </label>
            {form.scope === "BRAND" && (
              <label className="block">
                <span className={labelCls}>Brand</span>
                <select
                  value={form.brandId}
                  onChange={(e) => patch({ brandId: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Choose a brand…</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {form.scope === "CATEGORY" && (
              <label className="block">
                <span className={labelCls}>Category</span>
                <select
                  value={form.categoryId}
                  onChange={(e) => patch({ categoryId: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Choose a category…</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block">
              <span className={labelCls}>Starts (optional)</span>
              <input
                type="date"
                value={form.startsAt}
                onChange={(e) => patch({ startsAt: e.target.value })}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Expires (optional)</span>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => patch({ expiresAt: e.target.value })}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Max uses (optional)</span>
              <input
                inputMode="numeric"
                value={form.maxUses}
                onChange={(e) => patch({ maxUses: e.target.value })}
                placeholder="Unlimited"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Limit per customer (optional)</span>
              <input
                inputMode="numeric"
                value={form.perUserLimit}
                onChange={(e) => patch({ perUserLimit: e.target.value })}
                placeholder="Unlimited"
                className={inputCls}
              />
            </label>
          </div>

          {form.scope === "PRODUCT" && (
            <ProductPicker
              products={products}
              selected={form.productIds}
              onChange={(productIds) => patch({ productIds })}
            />
          )}

          <div className="mt-4 flex flex-wrap items-center gap-5">
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={form.firstPurchaseOnly}
                onChange={(e) =>
                  patch({ firstPurchaseOnly: e.target.checked })
                }
                className="h-4 w-4 rounded border-zinc-300"
              />
              First purchase only
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => patch({ isActive: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-300"
              />
              Live on the storefront
            </label>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={onSave}
              disabled={pending || form.code.trim() === ""}
              className={saveBtnCls}
            >
              {pending ? "Saving…" : "Save coupon"}
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              disabled={pending}
              className="h-9 rounded border border-zinc-200 px-4 text-sm text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/60 text-left text-xs uppercase tracking-wide text-zinc-400">
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Offer</th>
              <th className="px-4 py-3 font-medium">Conditions</th>
              <th className="px-4 py-3 font-medium">Store</th>
              <th className="px-4 py-3 font-medium">Used</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {coupons.map((row) => (
              <tr
                key={row.id}
                className="border-b border-zinc-50 last:border-0 align-top"
              >
                <td className="px-4 py-3">
                  <span className="font-mono font-semibold text-zinc-900">
                    {row.code}
                  </span>
                  {row.title && (
                    <p className="text-xs text-zinc-500">{row.title}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  {describeCouponValue(row, money)}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500">
                  {couponConditions(row, money).join(" · ") || "—"}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500">
                  {row.siteVersion === "all"
                    ? "Both"
                    : row.siteVersion === "local"
                      ? "India"
                      : "International"}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {row.redemptionCount}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onToggle(row)}
                    className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-medium transition-colors disabled:opacity-60 ${
                      row.isActive
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                    }`}
                  >
                    {row.isActive ? "Live" : "Hidden"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setForm(formFromRow(row))}
                      className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-60"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setDeleteTarget(row)}
                      className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-sm text-zinc-400"
                >
                  No coupons yet. Create the first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete ${deleteTarget?.code ?? "this coupon"}?`}
        message="This permanently removes the coupon. Coupons that have already been used cannot be deleted — hide them instead."
        confirmLabel="Delete"
        busy={pending}
        onConfirm={onDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

/** Searchable multi-select for the products a PRODUCT-scoped coupon covers. */
function ProductPicker({
  products,
  selected,
  onChange,
}: {
  products: CouponTarget[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products.slice(0, 100);
    return products
      .filter((product) => product.name.toLowerCase().includes(needle))
      .slice(0, 100);
  }, [products, query]);

  function toggle(id: string) {
    onChange(
      selected.includes(id)
        ? selected.filter((value) => value !== id)
        : [...selected, id],
    );
  }

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className={labelCls}>Products ({selected.length} selected)</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products…"
          className={`${inputCls} max-w-xs`}
        />
      </div>
      <div className="max-h-56 overflow-y-auto rounded border border-zinc-200 p-2">
        {filtered.map((product) => (
          <label
            key={product.id}
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            <input
              type="checkbox"
              checked={selected.includes(product.id)}
              onChange={() => toggle(product.id)}
              className="h-4 w-4 rounded border-zinc-300"
            />
            <span className="truncate">{product.name}</span>
          </label>
        ))}
        {filtered.length === 0 && (
          <p className="px-2 py-3 text-sm text-zinc-400">No products match.</p>
        )}
      </div>
    </div>
  );
}
