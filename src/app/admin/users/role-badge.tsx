const ROLE_BADGE: Record<string, string> = {
  normal: "bg-zinc-100 text-zinc-600",
  manager: "bg-amber-100 text-amber-700",
  admin: "bg-rose-100 text-rose-700",
};

/** Presentational, so the server list and the client editor share one badge. */
export function RoleBadge({ role }: { role?: string | null }) {
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
