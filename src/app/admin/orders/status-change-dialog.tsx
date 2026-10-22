"use client";

import { useEffect, useState } from "react";
import {
  ORDER_STATUS_LABELS,
  type OrderStatusValue,
} from "@/lib/order-status";

/**
 * Confirmation step shown before a manual status change. The admin picks what
 * else should happen with the change (invoice, customer email, admin email);
 * nothing is saved until "Update status".
 */
export function StatusChangeDialog({
  orderNumber,
  from,
  to,
  busy,
  onCancel,
  onConfirm,
}: {
  orderNumber: string;
  from: OrderStatusValue;
  to: OrderStatusValue;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (opts: {
    invoice: boolean;
    emailCustomer: boolean;
    emailAdmin: boolean;
  }) => void;
}) {
  const invoiceAvailable = to === "PAID" || to === "PRE_ORDER";
  const customerAvailable = to !== "PENDING";
  const [invoice, setInvoice] = useState(invoiceAvailable);
  const [emailCustomer, setEmailCustomer] = useState(customerAvailable);
  const [emailAdmin, setEmailAdmin] = useState(true);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm"
        onClick={() => !busy && onCancel()}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="status-change-title"
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h2
          id="status-change-title"
          className="text-lg font-semibold text-zinc-900"
        >
          Update status
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          {orderNumber}: {ORDER_STATUS_LABELS[from]} →{" "}
          <span className="font-medium text-zinc-900">
            {ORDER_STATUS_LABELS[to]}
          </span>
        </p>

        <div className="mt-5 space-y-3">
          {invoiceAvailable && (
            <Toggle
              checked={invoice}
              onChange={setInvoice}
              title="Create invoice"
              description="Generates the invoice for this order now. If one already exists, the existing invoice is kept."
            />
          )}
          <Toggle
            checked={emailCustomer}
            onChange={setEmailCustomer}
            disabled={!customerAvailable}
            title="Email customer"
            description={
              customerAvailable
                ? "Sends the standard status email to the customer's order address."
                : "There is no customer email for the Pending status."
            }
          />
          <Toggle
            checked={emailAdmin}
            onChange={setEmailAdmin}
            title="Email admin"
            description="Sends a short notice to this store's admin inbox with who made the change."
          />
        </div>

        <p className="mt-4 text-xs text-zinc-400">
          Nothing changes until you confirm. The status and the actions taken
          are added to the order&apos;s history.
        </p>

        <div className="mt-6 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onConfirm({ invoice, emailCustomer, emailAdmin })}
            disabled={busy}
            className="h-10 rounded bg-point-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
          >
            {busy ? "Updating…" : "Update status"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-10 rounded border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  title,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  title: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-lg border border-zinc-200 p-3 ${
        disabled ? "opacity-60" : "cursor-pointer hover:bg-zinc-50"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 rounded border-zinc-300 accent-point-500"
      />
      <span>
        <span className="block text-sm font-medium text-zinc-800">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-zinc-500">
          {description}
        </span>
      </span>
    </label>
  );
}
