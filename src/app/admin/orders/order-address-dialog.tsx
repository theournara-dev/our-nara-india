"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import { updateOrderShipping, type ShippingInput } from "./actions";

const inputCls =
  "h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500";
const labelCls = "mb-1 block text-xs font-medium text-zinc-500";

export interface ShippingFields {
  name?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postal?: string | null;
  country?: string | null;
}

function toInput(s: ShippingFields | null | undefined): ShippingInput {
  return {
    name: s?.name ?? "",
    phone: s?.phone ?? "",
    addressLine1: s?.addressLine1 ?? "",
    addressLine2: s?.addressLine2 ?? "",
    city: s?.city ?? "",
    state: s?.state ?? "",
    postal: s?.postal ?? "",
    country: s?.country ?? "IN",
  };
}

/**
 * Admin dialog to complete or correct an order's shipping/contact details —
 * chiefly to fill a missing or invalid postal code so a shipment can be
 * created. On the local store the postal must be a 6-digit Indian PIN.
 */
export function OrderAddressDialog({
  orderId,
  siteVersion,
  shipping,
}: {
  orderId: string;
  siteVersion: string;
  shipping: ShippingFields | null | undefined;
}) {
  const router = useRouter();
  const isLocal = siteVersion !== "global";
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<ShippingInput>(() => toInput(shipping));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function openDialog() {
    setValues(toInput(shipping));
    setErrors({});
    setOpen(true);
  }

  function set<K extends keyof ShippingInput>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!values.name.trim()) next.name = "Name is required";
    if (!values.phone.trim()) next.phone = "Phone is required";
    if (!values.addressLine1.trim())
      next.addressLine1 = "Address line 1 is required";
    if (!values.city.trim()) next.city = "City is required";
    if (!values.postal.trim()) next.postal = "Postal code is required";
    else if (isLocal && !/^\d{6}$/.test(values.postal.trim()))
      next.postal = "Enter a 6-digit Indian PIN code";
    if (!values.country.trim()) next.country = "Country is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function save() {
    if (!validate()) return;
    startTransition(async () => {
      const toastId = notify.loading("Saving address…");
      const res = await updateOrderShipping(orderId, values);
      if (!res.ok) {
        notify.error(toastId, "Could not save", res.message);
        return;
      }
      notify.success(toastId, "Address saved");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex h-7 items-center rounded-md border border-zinc-200 bg-white px-2.5 text-[11px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
      >
        Edit address
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm"
        onClick={pending ? undefined : () => setOpen(false)}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit shipping address"
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h3 className="text-lg font-semibold text-zinc-900">
          Shipping information
        </h3>
        <p className="mt-1 text-sm text-zinc-500">
          Complete any missing details so a shipment can be created.
        </p>

        <div className="mt-4 space-y-3 overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Name</span>
              <input
                value={values.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputCls}
              />
              {errors.name && (
                <span className="mt-1 block text-xs text-rose-600">
                  {errors.name}
                </span>
              )}
            </label>
            <label className="block">
              <span className={labelCls}>Phone</span>
              <input
                value={values.phone}
                onChange={(e) => set("phone", e.target.value)}
                className={inputCls}
              />
              {errors.phone && (
                <span className="mt-1 block text-xs text-rose-600">
                  {errors.phone}
                </span>
              )}
            </label>
          </div>

          <label className="block">
            <span className={labelCls}>Address line 1</span>
            <input
              value={values.addressLine1}
              onChange={(e) => set("addressLine1", e.target.value)}
              className={inputCls}
            />
            {errors.addressLine1 && (
              <span className="mt-1 block text-xs text-rose-600">
                {errors.addressLine1}
              </span>
            )}
          </label>

          <label className="block">
            <span className={labelCls}>Address line 2 (optional)</span>
            <input
              value={values.addressLine2}
              onChange={(e) => set("addressLine2", e.target.value)}
              className={inputCls}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>City</span>
              <input
                value={values.city}
                onChange={(e) => set("city", e.target.value)}
                className={inputCls}
              />
              {errors.city && (
                <span className="mt-1 block text-xs text-rose-600">
                  {errors.city}
                </span>
              )}
            </label>
            <label className="block">
              <span className={labelCls}>State</span>
              <input
                value={values.state}
                onChange={(e) => set("state", e.target.value)}
                className={inputCls}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>
                Postal code{isLocal ? " (6-digit PIN)" : ""}
              </span>
              <input
                value={values.postal}
                onChange={(e) => set("postal", e.target.value)}
                className={inputCls}
              />
              {errors.postal && (
                <span className="mt-1 block text-xs text-rose-600">
                  {errors.postal}
                </span>
              )}
            </label>
            <label className="block">
              <span className={labelCls}>Country</span>
              <input
                value={values.country}
                onChange={(e) => set("country", e.target.value)}
                className={inputCls}
              />
              {errors.country && (
                <span className="mt-1 block text-xs text-rose-600">
                  {errors.country}
                </span>
              )}
            </label>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={pending}
            className="h-9 rounded border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="h-9 flex-1 rounded bg-point-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save address"}
          </button>
        </div>
      </div>
    </div>
  );
}
