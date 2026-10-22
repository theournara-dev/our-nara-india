"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { notify } from "@/lib/toast";
import { markEmailVerified } from "./actions";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  emailVerified?: boolean | null;
};

/**
 * Block / unblock for one user. Roles and permissions are not editable here —
 * they are managed at the database level.
 */
export function UserAccess({ user }: { user: AdminUser }) {
  const [banned, setBanned] = useState<boolean>(user.banned ?? false);
  const [verified, setVerified] = useState<boolean>(
    user.emailVerified ?? false,
  );
  const [banReason, setBanReason] = useState<string | null>(
    user.banReason ?? null,
  );
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  async function blockUser() {
    setPending(true);
    const id = notify.loading("Blocking user…");
    const res = await authClient.admin.banUser({
      userId: user.id,
      banReason: reason.trim() || undefined,
    });
    setPending(false);
    if (res.error) {
      notify.error(id, "Block failed", res.error.message);
    } else {
      setBanned(true);
      setBanReason(reason.trim() || "No reason");
      setShowBlockForm(false);
      setReason("");
      notify.success(id, "User blocked", "They have been signed out.");
    }
  }

  async function verifyEmail() {
    setPending(true);
    const id = notify.loading("Verifying email…");
    const res = await markEmailVerified(user.id);
    setPending(false);
    if (!res.ok) {
      notify.error(id, "Verification failed", res.message);
      return;
    }
    setVerified(true);
    notify.success(id, "Email verified", "The customer can sign in now.");
  }

  async function unblockUser() {    setPending(true);
    const id = notify.loading("Unblocking user…");
    const res = await authClient.admin.unbanUser({ userId: user.id });
    setPending(false);
    if (res.error) {
      notify.error(id, "Unblock failed", res.error.message);
    } else {
      setBanned(false);
      setBanReason(null);
      notify.success(id, "User unblocked");
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-5">
      <h2 className="mb-3 font-semibold text-zinc-900">Access</h2>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-800">
            {banned ? "Blocked" : "Active"}
          </p>
          {banned && banReason && (
            <p className="truncate text-xs text-zinc-500">Reason: {banReason}</p>
          )}
          {banned && (
            <p className="text-xs text-zinc-400">
              The user has been signed out and cannot sign in until unblocked.
            </p>
          )}
        </div>
        {banned ? (
          <button
            type="button"
            onClick={unblockUser}
            disabled={pending}
            className="h-9 rounded border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-60"
          >
            {pending ? "…" : "Unblock"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowBlockForm((v) => !v)}
            className="h-9 rounded border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            Block user
          </button>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3">
        <p className="text-sm text-zinc-600">
          Email {verified ? "verified" : "not verified"}
        </p>
        {!verified && (
          <button
            type="button"
            onClick={verifyEmail}
            disabled={pending}
            className="h-9 rounded border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-60"
          >
            {pending ? "…" : "Mark email verified"}
          </button>
        )}
      </div>
      {showBlockForm && !banned && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            className="h-9 min-w-0 flex-1 rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500"
          />
          <button
            type="button"
            onClick={blockUser}
            disabled={pending}
            className="h-9 rounded bg-rose-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
          >
            {pending ? "Blocking…" : "Confirm block"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowBlockForm(false);
              setReason("");
            }}
            className="h-9 rounded px-3 text-sm text-zinc-500 hover:text-zinc-800"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
