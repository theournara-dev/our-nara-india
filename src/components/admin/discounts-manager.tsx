"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  hardDeleteDiscount,
  saveDiscount,
  setDiscountActive,
  softDeleteDiscount,
} from "@/app/admin/discounts/actions";
import { formatDateTime, toDatetimeLocal } from "@/lib/datetime";
import type {
  DiscountScope,
  DiscountStatus,
  DiscountType,
} from "@/lib/discounts";
import { formatMoney } from "@/lib/money";
import { notify } from "@/lib/toast";

const inputCls =
  "h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500";
const labelCls = "mb-1 block text-xs font-medium text-zinc-500";
const saveBtnCls =
  "h-9 rounded bg-point-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60";
const rowBtnCls =
  "rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-60";
const dangerBtnCls =
  "rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60";

type SiteVersionValue = "all" | "local" | "global";

export type TargetOption = { id: string; name: string };

export interface AdminDiscountRow {
  id: string;
  title: string;
  adminNote: string | null;
  type: DiscountType;
  value: number;
  scope: DiscountScope;
  brandId: string | null;
  categoryId: string | null;
  productId: string | null;
  siteVersion: SiteVersionValue;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  status: DiscountStatus;
  targetName: string | null;
}

const STATUS: Record<DiscountStatus, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-emerald-50 text-emerald-700" },
  paused: { label: "Paused", cls: "bg-zinc-100 text-zinc-500" },
  scheduled: { label: "Scheduled", cls: "bg-sky-50 text-sky-700" },
  expired: { label: "Expired", cls: "bg-amber-50 text-amber-700" },
  deleted: { label: "Deleted", cls: "bg-rose-50 text-rose-600" },
};

type FormState = {
  id: string | null;
  title: string;
  adminNote: string;
  type: DiscountType;
  /** Percent (as typed) for PERCENT discounts. */
  percent: string;
  /** Rupees (as typed) for FIXED discounts. */
  amount: string;
  scope: DiscountScope;
  brandId: string;
  categoryId: string;
  productId: string;
  siteVersion: SiteVersionValue;
  /** `datetime-local` values; empty = open-ended. */
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  id: null,
  title: "",
  adminNote: "",
  type: "PERCENT",
  percent: "10",
  amount: "",
  scope: "ALL",
  brandId: "",
  categoryId: "",
  productId: "",
  siteVersion: "all",
  startsAt: "",
  endsAt: "",
  isActive: true,
};

function toRupees(cents: number | null): string {
  if (cents == null) return "";
  return String(cents / 100);
}

function toCents(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : null;
}

/** `datetime-local` value from an ISO string. */
function toDateInput(iso: string | null): string {
  return iso ? toDatetimeLocal(new Date(iso)) : "";
}

/** ISO string from a `datetime-local` value; blank or invalid = no date. */
function toIso(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function formFromRow(row: AdminDiscountRow): FormState {
  return {
    id: row.id,
    title: row.title,
    adminNote: row.adminNote ?? "",
    type: row.type,
    percent: row.type === "PERCENT" ? String(row.value) : "10",
    amount: row.type === "FIXED" ? toRupees(row.value) : "",
    scope: row.scope,
    brandId: row.brandId ?? "",
    categoryId: row.categoryId ?? "",
    productId: row.productId ?? "",
    siteVersion: row.siteVersion,
    startsAt: toDateInput(row.startsAt),
    endsAt: toDateInput(row.endsAt),
    isActive: row.isActive,
  };
}

function targetLabel(row: AdminDiscountRow): string {
  switch (row.scope) {
    case "ALL":
      return "All products";
    case "BRAND":
      return `Brand · ${row.targetName ?? "—"}`;
    case "CATEGORY":
      return `Category · ${row.targetName ?? "—"}`;
    case "PRODUCT":
      return `Product · ${row.targetName ?? "—"}`;
  }
}

function storeLabel(version: SiteVersionValue): string {
  return version === "all"
    ? "Both"
    : version === "local"
      ? "India"
      : "International";
}

function windowLabel(row: AdminDiscountRow): string {
  if (!row.startsAt && !row.endsAt) return "Always";
  const start = row.startsAt ? formatDateTime(row.startsAt) : null;
  const end = row.endsAt ? formatDateTime(row.endsAt) : null;
  if (start && end) return `${start} → ${end}`;
  return start ? `From ${start}` : `Until ${end}`;
}

type ConfirmTarget = { row: AdminDiscountRow; kind: "soft" | "hard" };

/**
 * Discount manager: the list (with scope, store, window and status) and the
 * editor. Saving, pausing and deleting go through the admin actions in
 * `src/app/admin/discounts/actions.ts`; the storefront resolver applies
 * whatever is live.
 */
export function DiscountsManager({
  discounts,
  brands,
  categories,
  products,
}: {
  discounts: AdminDiscountRow[];
  brands: TargetOption[];
  categories: TargetOption[];
  products: TargetOption[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null);

  function patch(next: Partial<FormState>) {
    setForm((prev) => (prev ? { ...prev, ...next } : prev));
  }

  function onSave() {
    if (!form) return;
    startTransition(async () => {
      const toastId = notify.loading("Saving discount…");
      const res = await saveDiscount({
        id: form.id ?? undefined,
        title: form.title,
        adminNote: form.adminNote || undefined,
        type: form.type,
        value:
          form.type === "PERCENT"
            ? Math.round(Number.parseFloat(form.percent) || 0)
            : (toCents(form.amount) ?? 0),
        scope: form.scope,
        brandId: form.brandId || undefined,
        categoryId: form.categoryId || undefined,
        productId: form.productId || undefined,
        siteVersion: form.siteVersion,
        startsAt: toIso(form.startsAt),
        endsAt: toIso(form.endsAt),
        isActive: form.isActive,
      });
      if (!res.ok) {
        notify.error(toastId, "Could not save", res.message);
        return;
      }
      notify.success(toastId, "Discount saved", form.title);
      setForm(null);
      router.refresh();
    });
  }

  function onToggle(row: AdminDiscountRow) {
    startTransition(async () => {
      const res = await setDiscountActive(row.id, !row.isActive);
      if (!res.ok) {
        notify.error("Update failed", res.message);
        return;
      }
      notify.success(row.isActive ? "Discount paused" : "Discount resumed", row.title);
      router.refresh();
    });
  }

  function onConfirmDelete() {
    if (!confirm) return;
    const { row, kind } = confirm;
    startTransition(async () => {
      const toastId = notify.loading("Deleting discount…");
      const res =
        kind === "hard"
          ? await hardDeleteDiscount(row.id)
          : await softDeleteDiscount(row.id);
      if (!res.ok) {
        notify.error(toastId, "Could not delete", res.message);
        setConfirm(null);
        return;
      }
      notify.success(
        toastId,
        kind === "hard" ? "Discount permanently deleted" : "Discount deleted",
        row.title,
      );
      setConfirm(null);
      router.refresh();
    });
  }

  const targetOptions =
    form?.scope === "BRAND"
      ? brands
      : form?.scope === "CATEGORY"
        ? categories
        : form?.scope === "PRODUCT"
          ? products
          : [];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-zinc-900">
            Discounts
          </h1>
          <p className="text-sm text-zinc-500">
            {discounts.length} discount{discounts.length === 1 ? "" : "s"}.
            Live discounts apply automatically on product pages, in the cart and
            at checkout — the best one for each item wins.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setForm(EMPTY_FORM)}
          disabled={pending}
          className={saveBtnCls}
        >
          New discount
        </button>
      </div>

      {form && (
        <section className="rounded-2xl border border-zinc-100 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900">
            {form.id ? "Edit discount" : "New discount"}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className={labelCls}>Title (shown to customers)</span>
              <input
                value={form.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="Diwali sale"
                className={inputCls}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className={labelCls}>Admin note (optional, not shown)</span>
              <input
                value={form.adminNote}
                onChange={(e) => patch({ adminNote: e.target.value })}
                placeholder="Why this discount exists"
                className={inputCls}
              />
            </label>

            {/* ── Value ─────────────────────────────────────────────────── */}
            <label className="block">
              <span className={labelCls}>Discount type</span>
              <select
                value={form.type}
                onChange={(e) =>
                  patch({ type: e.target.value as DiscountType })
                }
                className={inputCls}
              >
                <option value="PERCENT">Percentage off</option>
                <option value="FIXED">Fixed amount off</option>
              </select>
            </label>
            {form.type === "PERCENT" ? (
              <label className="block">
                <span className={labelCls}>Percent off (1–100)</span>
                <input
                  inputMode="numeric"
                  value={form.percent}
                  onChange={(e) => patch({ percent: e.target.value })}
                  className={inputCls}
                />
              </label>
            ) : (
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
              <span className={labelCls}>Store</span>
              <select
                value={form.siteVersion}
                onChange={(e) =>
                  patch({ siteVersion: e.target.value as SiteVersionValue })
                }
                className={inputCls}
              >
                <option value="all">All stores</option>
                <option value="local">India</option>
                <option value="global">International</option>
              </select>
            </label>

            {/* ── Target ────────────────────────────────────────────────── */}
            <label className="block">
              <span className={labelCls}>Applies to</span>
              <select
                value={form.scope}
                onChange={(e) =>
                  patch({ scope: e.target.value as DiscountScope })
                }
                className={inputCls}
              >
                <option value="ALL">Everything</option>
                <option value="BRAND">One brand</option>
                <option value="CATEGORY">One category</option>
                <option value="PRODUCT">One product</option>
              </select>
            </label>
            {form.scope !== "ALL" && (
              <label className="block">
                <span className={labelCls}>
                  {form.scope === "BRAND"
                    ? "Brand"
                    : form.scope === "CATEGORY"
                      ? "Category"
                      : "Product"}
                </span>
                <select
                  value={
                    form.scope === "BRAND"
                      ? form.brandId
                      : form.scope === "CATEGORY"
                        ? form.categoryId
                        : form.productId
                  }
                  onChange={(e) =>
                    patch(
                      form.scope === "BRAND"
                        ? { brandId: e.target.value }
                        : form.scope === "CATEGORY"
                          ? { categoryId: e.target.value }
                          : { productId: e.target.value },
                    )
                  }
                  className={inputCls}
                >
                  <option value="">Choose…</option>
                  {targetOptions.map((target) => (
                    <option key={target.id} value={target.id}>
                      {target.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {/* ── Window ────────────────────────────────────────────────── */}
            <label className="block">
              <span className={labelCls}>Starts (optional)</span>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => patch({ startsAt: e.target.value })}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Ends (optional)</span>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => patch({ endsAt: e.target.value })}
                className={inputCls}
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-5">
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
              disabled={pending || form.title.trim() === ""}
              className={saveBtnCls}
            >
              {pending ? "Saving…" : "Save discount"}
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
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Value</th>
              <th className="px-4 py-3 font-medium">Applies to</th>
              <th className="px-4 py-3 font-medium">Store</th>
              <th className="px-4 py-3 font-medium">Window</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {discounts.map((row) => {
              const muted = row.deletedAt !== null;
              const status = STATUS[row.status];
              return (
                <tr
                  key={row.id}
                  className={`border-b border-zinc-50 align-top last:border-0 ${
                    muted ? "text-zinc-400" : "text-zinc-700"
                  }`}
                >
                  <td className="px-4 py-3">
                    <span
                      className={`font-semibold ${
                        muted ? "text-zinc-400" : "text-zinc-900"
                      }`}
                    >
                      {row.title}
                    </span>
                    {row.adminNote && (
                      <p className="text-xs text-zinc-400">{row.adminNote}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.type === "PERCENT"
                      ? `${row.value}%`
                      : formatMoney(row.value, "INR", { convert: false })}
                  </td>
                  <td className="px-4 py-3 text-xs">{targetLabel(row)}</td>
                  <td className="px-4 py-3 text-xs">
                    {storeLabel(row.siteVersion)}
                  </td>
                  <td className="px-4 py-3 text-xs">{windowLabel(row)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex h-7 items-center rounded-full px-2.5 text-xs font-medium ${status.cls}`}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {row.deletedAt ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => setConfirm({ row, kind: "hard" })}
                          className={dangerBtnCls}
                        >
                          Hard delete
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => setForm(formFromRow(row))}
                            className={rowBtnCls}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => onToggle(row)}
                            className={rowBtnCls}
                          >
                            {row.isActive ? "Pause" : "Resume"}
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => setConfirm({ row, kind: "soft" })}
                            className={dangerBtnCls}
                          >
                            Soft delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {discounts.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-sm text-zinc-400"
                >
                  No discounts yet. Create the first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm?.kind === "hard"
            ? `Permanently delete ${confirm.row.title}?`
            : `Delete ${confirm?.row.title ?? "this discount"}?`
        }
        message={
          confirm?.kind === "hard"
            ? "This removes the discount for good. Placed orders keep their own copy of it."
            : "The discount stops applying right away and moves to the deleted list, where you can permanently remove it."
        }
        confirmLabel={
          confirm?.kind === "hard" ? "Hard delete" : "Soft delete"
        }
        busy={pending}
        onConfirm={onConfirmDelete}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
