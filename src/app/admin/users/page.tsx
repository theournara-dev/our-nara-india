"use client";

import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import {
  statement,
  getEffectivePermissions,
  permissionsToSave,
} from "@/lib/permissions";
import { notify } from "@/lib/toast";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: Date | string | null;
  permissions?: Record<string, string[]> | null;
};

const ROLES = ["normal", "manager", "admin"] as const;

const ROLE_BADGE: Record<string, string> = {
  normal: "bg-zinc-100 text-zinc-600",
  manager: "bg-amber-100 text-amber-700",
  admin: "bg-rose-100 text-rose-700",
};

function RoleBadge({ role }: { role?: string | null }) {
  const key = role ?? "normal";
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
        ROLE_BADGE[key] ?? ROLE_BADGE.normal
      }`}
    >
      {key}
    </span>
  );
}

function UserRow({ user }: { user: AdminUser }) {
  const [role, setRole] = useState(user.role ?? "normal");
  const [perms, setPerms] = useState<Record<string, string[]>>(() =>
    getEffectivePermissions(user),
  );
  const [banned, setBanned] = useState<boolean>(user.banned ?? false);
  const [banReason, setBanReason] = useState<string | null>(
    user.banReason ?? null,
  );
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [reason, setReason] = useState("");
  const [accessPending, setAccessPending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Admin roles and permissions are fixed — they can only be changed at the
  // database level, so the entire card is read-only for anyone who holds the
  // admin role.
  const isAdmin = user.role === "admin";

  function toggle(resource: string, action: string) {
    setPerms((prev) => {
      const current = prev[resource] ?? [];
      const next = current.includes(action)
        ? current.filter((a) => a !== action)
        : [...current, action];
      return { ...prev, [resource]: next };
    });
  }

  async function saveRole(next: (typeof ROLES)[number]) {
    setRole(next);
    setMsg(null);
    const id = notify.loading(`Setting role to ${next}…`);
    const res = await authClient.admin.setRole({ userId: user.id, role: next });
    if (res.error) {
      setMsg(res.error.message ?? "Failed to update role.");
      notify.error(id, "Role update failed", res.error.message);
    } else {
      setMsg("Role updated.");
      notify.success(id, "Role updated");
    }
  }

  async function savePermissions() {
    setSaving(true);
    setMsg(null);
    const id = notify.loading("Saving permissions…");
    const toSave = permissionsToSave(role, perms);
    const res = await authClient.admin.updateUser({
      userId: user.id,
      data: { permissions: toSave },
    });
    setSaving(false);
    if (res.error) {
      setMsg(res.error.message ?? "Failed to save permissions.");
      notify.error(id, "Save failed", res.error.message);
    } else {
      setMsg("Permissions saved.");
      notify.success(id, "Permissions saved");
    }
  }

  async function blockUser() {
    setAccessPending(true);
    const id = notify.loading("Blocking user…");
    const res = await authClient.admin.banUser({
      userId: user.id,
      banReason: reason.trim() || undefined,
    });
    setAccessPending(false);
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

  async function unblockUser() {
    setAccessPending(true);
    const id = notify.loading("Unblocking user…");
    const res = await authClient.admin.unbanUser({ userId: user.id });
    setAccessPending(false);
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-zinc-900">{user.name}</p>
            <RoleBadge role={user.role} />
            {user.banned && (
              <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white">
                Blocked
              </span>
            )}
          </div>
          <p className="truncate text-sm text-zinc-500">
            {user.email}
            {user.username ? ` · @${user.username}` : ""}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          Role
          <select
            value={role}
            disabled={isAdmin}
            onChange={(e) => saveRole(e.target.value as (typeof ROLES)[number])}
            className="h-9 rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isAdmin && (
        <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          This user is an admin and is not editable. Admin roles and permissions
          are managed only at the database level.
        </p>
      )}

      {/* Access control — block / unblock. Banning revokes the user's
          sessions immediately, so a blocked user is signed out and cannot
          sign back in (the admin plugin rejects their session creation). */}
      {!isAdmin && (
        <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-800">
                Access: {banned ? "Blocked" : "Active"}
              </p>
              {banned && banReason && (
                <p className="truncate text-xs text-zinc-500">
                  Reason: {banReason}
                </p>
              )}
              {banned && (
                <p className="text-xs text-zinc-400">
                  The user has been signed out and cannot sign in until
                  unblocked.
                </p>
              )}
            </div>
            {banned ? (
              <button
                type="button"
                onClick={unblockUser}
                disabled={accessPending}
                className="h-9 rounded border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-60"
              >
                {accessPending ? "…" : "Unblock"}
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
                disabled={accessPending}
                className="h-9 rounded bg-rose-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
              >
                {accessPending ? "Blocking…" : "Confirm block"}
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
      )}

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Permissions
        </p>
        <div
          className={`space-y-3 ${isAdmin ? "pointer-events-none opacity-50" : ""}`}
        >
          {Object.entries(statement).map(([resource, actions]) => (
            <div key={resource} className="flex flex-wrap items-center gap-3">
              <span className="w-24 shrink-0 text-sm capitalize text-zinc-700">
                {resource}
              </span>
              <div className="flex flex-wrap items-center gap-3">
                {actions.map((action) => {
                  const checked = (perms[resource] ?? []).includes(action);
                  return (
                    <label
                      key={action}
                      className="flex items-center gap-1.5 text-sm text-zinc-600"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isAdmin}
                        onChange={() => toggle(resource, action)}
                        className="h-4 w-4 rounded border-zinc-300 disabled:cursor-not-allowed"
                      />
                      {action}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={savePermissions}
          disabled={saving || isAdmin}
          className="h-9 rounded bg-point-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Permissions"}
        </button>
        {msg && <span className="text-sm text-zinc-500">{msg}</span>}
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      setOpen(false);
      setSearching(false);
    } else {
      setSearching(true);
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) return;
    debounceRef.current = setTimeout(async () => {
      // Search by email, name (searchValue) and username (filterField) in
      // parallel, then merge + dedupe by id so one query covers all three
      // fields.
      const [byEmail, byName, byUsername] = await Promise.all([
        authClient.admin.listUsers({
          query: {
            searchValue: q,
            searchField: "email",
            searchOperator: "contains",
            limit: 20,
          },
        }),
        authClient.admin.listUsers({
          query: {
            searchValue: q,
            searchField: "name",
            searchOperator: "contains",
            limit: 20,
          },
        }),
        authClient.admin.listUsers({
          query: {
            filterField: "username",
            filterValue: q,
            filterOperator: "contains",
            limit: 20,
          },
        }),
      ]);
      const map = new Map<string, AdminUser>();
      for (const res of [byEmail, byName, byUsername]) {
        if (res.error) {
          setError(res.error.message ?? "Search failed.");
        } else {
          for (const u of res.data?.users ?? []) map.set(u.id, u);
        }
      }
      setResults([...map.values()]);
      setOpen(true);
      setSearching(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900">
        Users &amp; Permissions
      </h1>
      <p className="mb-6 text-sm text-zinc-500">
        Search for a user by name, email or username, then manage their role and
        permissions.
      </p>

      <div className="relative mb-6 max-w-md">
        {open && (
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
        )}
        <input
          type="search"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search by name, email or username…"
          className="relative z-20 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-point-500"
        />
        {open && results.length > 0 && (
          <ul className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
            {results.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(u);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-50"
                >
                  <span className="min-w-0 flex-1 truncate font-medium text-zinc-900">
                    {u.name}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-zinc-500">
                    {u.email}
                  </span>
                  {u.username ? (
                    <span className="min-w-0 shrink-0 truncate text-zinc-400">
                      @{u.username}
                    </span>
                  ) : null}
                  <RoleBadge role={u.role} />
                  {u.banned && (
                    <span className="shrink-0 rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white">
                      Blocked
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        {open && results.length === 0 && !searching && (
          <p className="relative z-20 mt-1 text-xs text-zinc-400">
            No users found.
          </p>
        )}
      </div>

      {searching && <p className="mb-4 text-sm text-zinc-500">Searching…</p>}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {selected ? (
        <UserRow key={selected.id} user={selected} />
      ) : (
        <p className="text-sm text-zinc-500">
          Select a user above to view and edit their role and permissions.
        </p>
      )}
    </div>
  );
}
