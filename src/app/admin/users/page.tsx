"use client";

import { useEffect, useState } from "react";
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
  permissions?: Record<string, string[]> | null;
};

const ROLES = ["normal", "manager", "admin"] as const;

function UserRow({ user }: { user: AdminUser }) {
  const [role, setRole] = useState(user.role ?? "normal");
  const [perms, setPerms] = useState<Record<string, string[]>>(() =>
    getEffectivePermissions(user),
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-medium text-zinc-900">{user.name}</p>
          <p className="text-sm text-zinc-500">
            {user.email}
            {user.username ? ` · @${user.username}` : ""}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          Role
          <select
            value={role}
            onChange={(e) => saveRole(e.target.value as (typeof ROLES)[number])}
            className="h-9 rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Permissions
        </p>
        <div className="space-y-3">
          {Object.entries(statement).map(([resource, actions]) => (
            <div key={resource} className="flex flex-wrap items-center gap-3">
              <span className="w-24 text-sm capitalize text-zinc-700">
                {resource}
              </span>
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
                      onChange={() => toggle(resource, action)}
                      className="h-4 w-4 rounded border-zinc-300"
                    />
                    {action}
                  </label>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={savePermissions}
          disabled={saving}
          className="h-9 rounded bg-point-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Permissions"}
        </button>
        {msg && <span className="text-sm text-zinc-500">{msg}</span>}
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await authClient.admin.listUsers({ query: { limit: 100 } });
      if (res.error) {
        setError(res.error.message ?? "Could not load users.");
      } else {
        setUsers(res.data?.users ?? []);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900">
        Users &amp; Permissions
      </h1>
      <p className="mb-6 text-sm text-zinc-500">
        Set each user&apos;s role and grant or revoke individual permissions.
      </p>

      {loading && <p className="text-sm text-zinc-500">Loading users…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-4">
        {users.map((user) => (
          <UserRow key={user.id} user={user} />
        ))}
      </div>
    </div>
  );
}
