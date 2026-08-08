import { createAccessControl } from "better-auth/plugins/access";

/**
 * Access-control statement for the store. Each resource lists the actions
 * that can be granted. Roles define defaults; individual users can be granted
 * extra permissions on top of their role via the `permissions` field (see
 * `getEffectivePermissions`).
 */
export const statement = {
  product: ["create", "read", "update", "delete"],
  banner: ["create", "read", "update", "delete"],
  popup: ["create", "read", "update", "delete"],
  // `user` and `session` actions must match the Better Auth admin plugin's
  // statement (see node_modules/better-auth/dist/plugins/admin/access/statement.mjs).
  // The plugin checks these exact names (e.g. listUsers requires user:["list"]),
  // so omitting them breaks admin endpoints even for the admin role.
  user: [
    "create",
    "list",
    "get",
    "update",
    "delete",
    "set-role",
    "set-email",
    "set-password",
    "ban",
    "impersonate",
    "impersonate-admins",
  ],
  session: ["list", "revoke", "delete"],
  order: ["read", "update"],
  coupon: ["create", "read", "update", "delete"],
} as const;

export const ac = createAccessControl(statement);

/** Default role permissions (used by the admin plugin for its own operations). */
export const normal = ac.newRole({});
export const manager = ac.newRole({
  product: ["create", "read", "update", "delete"],
  banner: ["create", "read", "update", "delete"],
  popup: ["create", "read", "update", "delete"],
});
export const admin = ac.newRole({
  product: ["create", "read", "update", "delete"],
  banner: ["create", "read", "update", "delete"],
  popup: ["create", "read", "update", "delete"],
  user: [
    "create",
    "list",
    "get",
    "update",
    "delete",
    "set-role",
    "set-email",
    "set-password",
    "ban",
    "impersonate",
    "impersonate-admins",
  ],
  session: ["list", "revoke", "delete"],
  order: ["read", "update"],
  coupon: ["create", "read", "update", "delete"],
});

export const roles = { normal, manager, admin };

/** Plain-object role defaults, used to compute effective permissions. */
const roleDefaults: Record<string, Record<string, string[]>> = {
  normal: {},
  manager: {
    product: ["create", "read", "update", "delete"],
    banner: ["create", "read", "update", "delete"],
    popup: ["create", "read", "update", "delete"],
  },
  admin: {
    product: ["create", "read", "update", "delete"],
    banner: ["create", "read", "update", "delete"],
    popup: ["create", "read", "update", "delete"],
    user: [
      "create",
      "list",
      "get",
      "update",
      "delete",
      "set-role",
      "set-email",
      "set-password",
      "ban",
      "impersonate",
      "impersonate-admins",
    ],
    session: ["list", "revoke", "delete"],
    order: ["read", "update"],
    coupon: ["create", "read", "update", "delete"],
  },
};

export type PermissionUser = {
  role?: string | null;
  permissions?: Record<string, string[]> | null;
};

/**
 * Effective permissions for a user. If the user has an explicit `permissions`
 * set it is used as-is (full override, so admins can both grant and revoke);
 * otherwise the role defaults apply. This is what app-level guards should check.
 */
export function getEffectivePermissions(
  user: PermissionUser,
): Record<string, string[]> {
  if (user.permissions) return user.permissions;
  const role = user.role ?? "normal";
  return roleDefaults[role] ?? {};
}

/**
 * Compute the `permissions` value to persist for a user given the desired
 * effective set. If it matches the role defaults exactly, returns `null` so the
 * user keeps tracking role defaults (a no-op edit doesn't materialize them).
 * Otherwise returns the explicit set.
 */
export function permissionsToSave(
  role: string | null | undefined,
  effective: Record<string, string[]>,
): Record<string, string[]> | null {
  const base = roleDefaults[role ?? "normal"] ?? {};
  const same = Object.keys(statement).every(
    (resource) =>
      JSON.stringify([...(effective[resource] ?? [])].sort()) ===
      JSON.stringify([...(base[resource] ?? [])].sort()),
  );
  return same ? null : effective;
}

export function hasPermission(
  user: PermissionUser,
  resource: keyof typeof statement,
  action: string,
): boolean {
  return getEffectivePermissions(user)[resource]?.includes(action) ?? false;
}
