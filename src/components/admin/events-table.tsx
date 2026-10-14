"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { notify } from "@/lib/toast";
import { formatDateTime } from "@/lib/datetime";
import {
  deleteEvent,
  moveEvent,
  toggleEventActive,
} from "@/app/admin/events/actions";

export interface AdminEventRow {
  id: string;
  title: string;
  text: string | null;
  dateLabel: string | null;
  image: string | null;
  color: string | null;
  href: string | null;
  isActive: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
}

/**
 * Event list for the admin: the /event cards with their schedule and state.
 * Order is managed right here with the up/down arrows (the edit form doesn't
 * carry a sort field).
 */
export function EventsTable({ events }: { events: AdminEventRow[] }) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<AdminEventRow | null>(null);
  const [pending, startTransition] = useTransition();

  function onToggle(row: AdminEventRow) {
    startTransition(async () => {
      const res = await toggleEventActive(row.id, !row.isActive);
      if (!res.ok) {
        notify.error("Update failed", res.message);
        return;
      }
      notify.success(
        row.isActive ? "Event hidden" : "Event visible",
        row.title,
      );
      router.refresh();
    });
  }

  function onMove(row: AdminEventRow, direction: "up" | "down") {
    startTransition(async () => {
      await moveEvent(row.id, direction);
      router.refresh();
    });
  }

  function onDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    startTransition(async () => {
      const tid = notify.loading("Deleting event…");
      const res = await deleteEvent(target.id);
      if (!res.ok) {
        notify.error(tid, "Could not delete", res.message);
        setDeleteTarget(null);
        return;
      }
      notify.success(tid, "Event deleted", target.title);
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
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Event</th>
              <th className="px-4 py-3 font-medium">Date label</th>
              <th className="px-4 py-3 font-medium">Window</th>
              <th className="px-4 py-3 font-medium">On storefront</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {events.map((row, index) => (
              <tr
                key={row.id}
                className="border-b border-zinc-50 last:border-0"
              >
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Move up"
                      disabled={index === 0 || pending}
                      onClick={() => onMove(row, "up")}
                      className="grid h-7 w-7 place-items-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ChevronUp className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      aria-label="Move down"
                      disabled={index === events.length - 1 || pending}
                      onClick={() => onMove(row, "down")}
                      className="grid h-7 w-7 place-items-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ChevronDown className="h-4 w-4" aria-hidden />
                    </button>
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-start gap-3">
                    {row.image ? (
                      <Image
                        src={row.image}
                        alt=""
                        width={64}
                        height={40}
                        unoptimized
                        className="h-10 w-16 shrink-0 rounded border border-zinc-100 object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="h-10 w-16 shrink-0 rounded border border-zinc-100"
                        style={{
                          backgroundColor: row.color ?? "#6f2dbd",
                        }}
                      />
                    )}
                    <span className="min-w-0">
                      <span className="block font-medium text-zinc-900">
                        {row.title}
                      </span>
                      {row.text && (
                        <span className="mt-0.5 line-clamp-2 block text-xs text-zinc-500">
                          {row.text}
                        </span>
                      )}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {row.dateLabel ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500">
                  {row.startsAt || row.expiresAt ? (
                    <>
                      {row.startsAt ? formatDateTime(row.startsAt) : "Always"}
                      {" → "}
                      {row.expiresAt ? formatDateTime(row.expiresAt) : "No end"}
                    </>
                  ) : (
                    "Always on"
                  )}
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
                    title={
                      row.isActive
                        ? "Hide from the storefront"
                        : "Show on the storefront"
                    }
                  >
                    {row.isActive ? "Visible" : "Hidden"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex gap-2">
                    <Link
                      href={`/admin/events/${row.id}/edit`}
                      className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-point-50 hover:text-point-600"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setDeleteTarget(row)}
                      className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </span>
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-zinc-400"
                >
                  No events yet. Add one to fill the /event page.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete ${deleteTarget?.title ?? "this event"}?`}
        message="This permanently removes the event card from the /event page."
        confirmLabel="Delete"
        busy={pending}
        onConfirm={onDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
