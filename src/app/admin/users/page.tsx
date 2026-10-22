import Link from "next/link";
import { db } from "@/lib/db";
import { RoleBadge } from "./role-badge";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

/** Compact list of page numbers, collapsing long ranges with an ellipsis. */
function pageList(current: number, total: number): (number | "…")[] {
  const candidates = new Set([1, total, current, current - 1, current + 1]);
  const pages = [...candidates]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  let prev = 0;
  for (const p of pages) {
    if (p - prev > 1) result.push("…");
    result.push(p);
    prev = p;
  }
  return result;
}

type SearchParams = Promise<{ q?: string; page?: string }>;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
          { username: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        banned: true,
        createdAt: true,
      },
    }),
    db.user.count({ where }),
  ]);

  // Purchases: orders placed while signed in plus guest orders made with the
  // same email (same rule as the customer account pages).
  const ids = users.map((u) => u.id);
  const emails = users.map((u) => u.email.toLowerCase());
  const [ordersByUser, ordersByEmail, wishlistsByUser] = await Promise.all([
    db.order.groupBy({
      by: ["userId"],
      where: { userId: { in: ids } },
      _count: true,
    }),
    db.order.groupBy({
      by: ["email"],
      where: { userId: null, email: { in: emails } },
      _count: true,
    }),
    db.wishlistItem.groupBy({
      by: ["userId"],
      where: { userId: { in: ids } },
      _count: true,
    }),
  ]);
  const orderCountByUser = new Map(
    ordersByUser.map((row) => [row.userId, row._count]),
  );
  const orderCountByEmail = new Map(
    ordersByEmail.map((row) => [row.email.toLowerCase(), row._count]),
  );
  const wishlistCountByUser = new Map(
    wishlistsByUser.map((row) => [row.userId, row._count]),
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function href(overrides: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    for (const [k, v] of Object.entries(overrides)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    const qs = sp.toString();
    return `/admin/users${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900">
        Users &amp; Permissions
      </h1>
      <p className="mb-6 text-sm text-zinc-500">
        Every registered customer and staff member. Select a user to open their
        contact details, purchases, wishlist, role and permissions.
      </p>

      <form method="get" className="mb-4 flex max-w-md gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name, email or username…"
          className="h-10 min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-point-500"
        />
        <button
          type="submit"
          className="h-10 rounded-lg bg-point-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-point-600"
        >
          Search
        </button>
        {q && (
          <Link
            href="/admin/users"
            className="inline-flex h-10 items-center rounded-lg px-3 text-sm text-zinc-500 hover:text-zinc-800"
          >
            Clear
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-2xl border border-zinc-100 bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 text-right font-medium">Orders</th>
              <th className="px-4 py-3 text-right font-medium">Wishlist</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                  No users match this search.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const orderCount =
                  (orderCountByUser.get(u.id) ?? 0) +
                  (orderCountByEmail.get(u.email.toLowerCase()) ?? 0);
                return (
                  <tr
                    key={u.id}
                    className="border-b border-zinc-50 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="font-medium text-zinc-900 transition-colors hover:text-point-500"
                      >
                        {u.name || "—"}
                      </Link>
                      {u.username && (
                        <p className="truncate text-xs text-zinc-400">
                          @{u.username}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{u.email}</td>
                    <td className="px-4 py-3 text-zinc-500">
                      {new Date(u.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-700">
                      {orderCount}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-700">
                      {wishlistCountByUser.get(u.id) ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      {u.banned ? (
                        <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white">
                          Blocked
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <p className="text-sm text-zinc-500">
            Showing {(page - 1) * PAGE_SIZE + 1}
            {"–"}
            {Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            {page > 1 && (
              <Link
                href={href({ page: String(page - 1) })}
                className="inline-flex h-9 items-center justify-center rounded border border-zinc-200 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                Prev
              </Link>
            )}
            {pageList(page, totalPages).map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} className="px-2 text-sm text-zinc-400">
                  …
                </span>
              ) : (
                <Link
                  key={p}
                  href={href({ page: String(p) })}
                  aria-current={p === page ? "page" : undefined}
                  className={`inline-flex h-9 min-w-9 items-center justify-center rounded border px-3 text-sm ${
                    p === page
                      ? "border-point-500 bg-point-500 font-semibold text-white"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {p}
                </Link>
              ),
            )}
            {page < totalPages && (
              <Link
                href={href({ page: String(page + 1) })}
                className="inline-flex h-9 items-center justify-center rounded border border-zinc-200 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
