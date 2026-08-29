"use client";

import { useState, useTransition } from "react";
import { notify } from "@/lib/toast";
import { trackingUrl } from "@/lib/delhivery-client";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  cancelShipment,
  createShipment,
  deleteOrder as deleteOrderAction,
  importShipment,
  schedulePickup,
  syncShipment,
  updateOrderStatus,
} from "./actions";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  type OrderStatusValue,
} from "./status";

const SHIPMENT_LABELS: Record<string, string> = {
  CREATED: "Created",
  PICKUP_SCHEDULED: "Pickup scheduled",
  IN_TRANSIT: "In transit",
  DELIVERED: "Delivered",
  RTO: "RTO",
  CANCELLED: "Cancelled",
  FAILED: "Failed",
};

const SHIPMENT_STYLES: Record<string, string> = {
  CREATED: "bg-amber-100 text-amber-700",
  PICKUP_SCHEDULED: "bg-sky-100 text-sky-700",
  IN_TRANSIT: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  RTO: "bg-violet-100 text-violet-700",
  CANCELLED: "bg-zinc-100 text-zinc-500",
  FAILED: "bg-rose-100 text-rose-700",
};

export interface ShipmentSummary {
  waybill: string;
  status: string;
  providerStatus?: string;
  lastSyncedAt?: string;
}

interface ShippingInfo {
  name?: string;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postal?: string | null;
}

/** Per-order fulfillment controls: status select + shipment management. */
export function OrderRowActions({
  id,
  status,
  shipment,
  shipping,
  totalCents,
  orderNumber,
}: {
  id: string;
  status: OrderStatusValue;
  shipment?: {
    waybill: string;
    status: string;
    providerStatus?: string;
    lastSyncedAt?: string;
  };
  shipping: ShippingInfo;
  totalCents: number;
  orderNumber: string;
}) {
  const [pending, startTransition] = useTransition();
  const [importOpen, setImportOpen] = useState(false);
  const [waybillInput, setWaybillInput] = useState("");

  function run(label: string, fn: () => Promise<void>, toastId?: string) {
    startTransition(async () => {
      const id = toastId ?? notify.loading(`${label}…`);
      try {
        await fn();
        notify.success(id, `${label} done`);
        setImportOpen(false);
        setWaybillInput("");
      } catch (err) {
        notify.error(
          id,
          `${label} failed`,
          err instanceof Error ? err.message : "Try again.",
        );
      }
    });
  }

  function onChange(next: string) {
    if (next === status) return;
    run("Updating status", async () => {
      await updateOrderStatus(id, next);
    });
  }

  // Shared button base so every action reads as part of one toolbar.
  const canFulfill = status === "PAID" || status === "PRE_ORDER";
  const btn =
    "inline-flex h-7 items-center rounded-md border border-zinc-200 bg-white px-2.5 text-[11px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50";
  const btnGhost =
    "inline-flex h-7 items-center rounded-md px-2 text-[11px] font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex flex-col items-stretch gap-1.5">
      {/* Row 1: status */}
      <select
        value={status}
        onChange={(e) => onChange(e.target.value)}
        disabled={pending}
        aria-label="Order status"
        className="h-7 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {ORDER_STATUS_LABELS[s]}
          </option>
        ))}
      </select>

      {/* Row 2: shipment summary or create/import buttons */}
      {shipment ? (
        <div className="flex items-center justify-between gap-1.5 rounded-md bg-zinc-50 px-2 py-1">
          <span
            title={`Synced ${shipment.lastSyncedAt ? new Date(shipment.lastSyncedAt).toLocaleString("en-IN") : "never"}${shipment.providerStatus ? ` · Delhivery: ${shipment.providerStatus}` : ""}`}
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${SHIPMENT_STYLES[shipment.status] ?? "bg-zinc-100"}`}
          >
            {SHIPMENT_LABELS[shipment.status] ?? shipment.status}
          </span>
          <div className="flex items-center gap-1 overflow-hidden">
            <a
              href={trackingUrl(shipment.waybill)}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-[11px] text-point-500 hover:underline"
              title="Open tracking at Delhivery"
            >
              {shipment.waybill} ↗
            </a>
            <button
              type="button"
              disabled={pending}
              onClick={() => run("Syncing shipment", async () => { await syncShipment(shipment.waybill); })}
              className="shrink-0 text-[11px] text-zinc-400 hover:text-point-500 disabled:opacity-50"
            >
              Sync
            </button>
            {(shipment.status === "CREATED" || shipment.status === "PICKUP_SCHEDULED") && (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run("Scheduling pickup", async () => { await schedulePickup(); })}
                  className="shrink-0 text-[11px] text-zinc-400 hover:text-point-500 disabled:opacity-50"
                >
                  Pickup
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run("Cancelling shipment", async () => { await cancelShipment(shipment.waybill); })}
                  className="shrink-0 text-[11px] text-zinc-400 hover:text-rose-600 disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        canFulfill && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run("Creating shipment", async () => {
                  await createShipment({
                    orderId: id,
                    orderNumber,
                    customerName: shipping.name ?? "Customer",
                    phone: shipping.phone ?? "",
                    addressLine1: shipping.addressLine1 ?? "",
                    addressLine2: shipping.addressLine2 ?? undefined,
                    city: shipping.city ?? "",
                    state: shipping.state ?? undefined,
                    postal: shipping.postal ?? "",
                    amountCents: totalCents,
                  });
                })
              }
              className={`${btn} border-point-400 text-point-600 hover:border-point-500 hover:bg-point-500 hover:text-white`}
            >
              Create shipment
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setImportOpen((v) => !v)}
              className={btnGhost}
            >
              Import
            </button>
          </div>
        )
      )}

      {/* Row 3 (conditional): waybill import input */}
      {importOpen && !shipment && (
        <div className="flex items-center gap-1">
          <input
            value={waybillInput}
            onChange={(e) => setWaybillInput(e.target.value)}
            placeholder="Waybill number"
            className="h-7 w-full min-w-0 rounded-md border border-zinc-200 px-2 text-xs"
          />
          <button
            type="button"
            disabled={pending || !waybillInput.trim()}
            onClick={() =>
              run("Importing shipment", async () => {
                await importShipment(id, waybillInput.trim());
              })
            }
            className={`${btn} shrink-0`}
          >
            Attach
          </button>
        </div>
      )}
    </div>
  );
}

/** Per-row delete control, rendered in its own table column. */
export function OrderDeleteAction({
  id,
  orderNumber,
}: {
  id: string;
  orderNumber: string;
}) {
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  function handleDelete() {
    setDeleteOpen(false);
    startTransition(async () => {
      const tid = notify.loading("Deleting order…");
      try {
        await deleteOrderAction(id);
        notify.success(tid, "Order deleted");
      } catch (err) {
        notify.error(
          tid,
          "Delete failed",
          err instanceof Error ? err.message : "Try again.",
        );
      }
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => setDeleteOpen(true)}
        className="inline-flex h-7 items-center rounded-md px-2 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Delete
      </button>
      <ConfirmDialog
        open={deleteOpen}
        title={`Delete order ${orderNumber}?`}
        message="This permanently removes the order with its items, payments and shipment history. This cannot be undone."
        confirmLabel="Delete order"
        busy={pending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </>
  );
}
