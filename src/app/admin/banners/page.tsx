import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { ContentTabs } from "@/components/admin/content-tabs";
import {
  toggleBannerActive,
  softDeleteBanner,
  hardDeleteBanner,
} from "./actions";
import { BannerRowActions } from "./row-actions";
import { BannerFilters } from "./filters";
import { currentQuery, PLACEMENT_LABELS } from "./lib";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

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

type SearchParams = Promise<{
  page?: string;
  search?: string;
  placement?: string;
  active?: string;
}>;

export default async function AdminBannersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search?.trim() ?? "";
  const placement = params.placement ?? "";
  const active = params.active ?? "";

  const where = {
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { alt: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(placement ? { placement } : {}),
    ...(active === "active"
      ? { isActive: true }
      : active === "inactive"
        ? { isActive: false }
        : {}),
  };

  const [banners, total] = await Promise.all([
    db.banner.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: [{ placement: "asc" }, { sortOrder: "asc" }],
    }),
    db.banner.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filterQuery = currentQuery({
    search,
    placement,
    active,
    page: String(page),
  });

  function href(overrides: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    if (search) sp.set("search", search);
    if (placement) sp.set("placement", placement);
    if (active) sp.set("active", active);
    for (const [k, v] of Object.entries(overrides)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    const qs = sp.toString();
    return `/admin/banners${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <ContentTabs active="banners" />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-zinc-900">Banners</h1>
          <p className="text-sm text-zinc-500">
            Showing {(page - 1) * PAGE_SIZE + 1}
            {"–"}
            {Math.min(page * PAGE_SIZE, total)} of {total} banner
            {total === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href={`/admin/banners/new${filterQuery}`}
          className="inline-flex h-9 items-center justify-center rounded bg-point-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-point-600"
        >
          + New banner
        </Link>
      </div>

      <BannerFilters search={search} placement={placement} active={active} />

      <div className="overflow-x-auto rounded-2xl border border-zinc-100 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
              <th className="px-4 py-3 font-medium">Banner</th>
              <th className="px-4 py-3 font-medium">Placement</th>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {banners.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-zinc-500"
                >
                  No banners found.
                </td>
              </tr>
            ) : (
              banners.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-zinc-50 last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {b.image ? (
                        <Image
                          src={b.image}
                          alt={b.alt ?? b.title}
                          width={120}
                          height={40}
                          unoptimized
                          loading="lazy"
                          className="h-10 w-28 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-28 shrink-0 rounded bg-zinc-100" />
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/admin/banners/${b.id}/edit${filterQuery}`}
                          className="block max-w-[260px] truncate font-medium text-zinc-900 hover:text-point-500"
                        >
                          {b.title}
                        </Link>
                        {b.alt && (
                          <span className="text-xs text-zinc-400">{b.alt}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {PLACEMENT_LABELS[b.placement as keyof typeof PLACEMENT_LABELS] ??
                      b.placement}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{b.sortOrder}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        b.isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {b.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <BannerRowActions
                      id={b.id}
                      isActive={b.isActive}
                      editHref={`/admin/banners/${b.id}/edit${filterQuery}`}
                      toggle={toggleBannerActive}
                      remove={softDeleteBanner}
                      hardDelete={hardDeleteBanner}
                    />
                  </td>
                </tr>
              ))
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
