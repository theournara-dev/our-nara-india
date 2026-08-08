"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { notify } from "@/lib/toast";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

type ToggleAction = (id: string, isActive: boolean) => Promise<void>;
type RemoveAction = (id: string) => Promise<void>;

export function BannerRowActions({
  id,
  isActive,
  editHref,
  toggle,
  remove,
  hardDelete,
}: {
  id: string;
  isActive: boolean;
  editHref: string;
  toggle: ToggleAction;
  remove: RemoveAction;
  hardDelete: RemoveAction;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function onToggle() {
    startTransition(async () => {
      const toastId = notify.loading(
        isActive ? "Deactivating…" : "Activating…",
      );
      try {
        await toggle(id, !isActive);
        notify.success(
          toastId,
          isActive ? "Banner deactivated" : "Banner activated",
        );
      } catch (err) {
        notify.error(
          toastId,
          "Action failed",
          err instanceof Error ? err.message : "Try again.",
        );
      }
    });
  }

  function onSoftDelete() {
    startTransition(async () => {
      const toastId = notify.loading("Deactivating…");
      try {
        await remove(id);
        notify.success(toastId, "Banner deactivated");
        setConfirmOpen(false);
      } catch (err) {
        notify.error(
          toastId,
          "Action failed",
          err instanceof Error ? err.message : "Try again.",
        );
        setConfirmOpen(false);
      }
    });
  }

  function onHardDelete() {
    startTransition(async () => {
      const toastId = notify.loading("Deleting permanently…");
      try {
        await hardDelete(id);
        notify.success(toastId, "Banner deleted");
        setConfirmOpen(false);
      } catch (err) {
        notify.error(
          toastId,
          "Delete failed",
          err instanceof Error ? err.message : "Try again.",
        );
        setConfirmOpen(false);
      }
    });
  }

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <Link
          href={editHref}
          className="rounded border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
        >
          Edit
        </Link>
        <button
          type="button"
          onClick={onToggle}
          disabled={pending}
          className="rounded border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
        >
          {isActive ? "Deactivate" : "Activate"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={pending}
          className="rounded border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
        >
          Delete
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete banner?"
        message="Deactivate hides it from the storefront but keeps it in the database. Delete permanently removes it for good — this cannot be undone."
        confirmLabel="Deactivate"
        tone="primary"
        secondaryLabel="Delete permanently"
        busy={pending}
        onSecondary={onHardDelete}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={onSoftDelete}
      />
    </>
  );
}
