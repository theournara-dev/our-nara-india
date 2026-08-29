import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/datetime";
import { FeedbackStatusSelect } from "./status-select";
import {
  FEEDBACK_STATUS_LABELS,
  type FeedbackStatusValue,
} from "./status";
import type { FeedbackStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const STATUSES = Object.keys(FEEDBACK_STATUS_LABELS) as FeedbackStatusValue[];

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

type SearchParams = Promise<{ page?: string; status?: string; q?: string }>;

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const status = (STATUSES as string[]).includes(params.status ?? "")
    ? (params.status as FeedbackStatus)
    : "";
  const q = params.q?.trim() ?? "";

  const where = {
    ...(status ? { status: status as FeedbackStatus } : {}),
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" as const } },
            { message: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    db.feedback.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
    }),
    db.feedback.count({ where }),
  ]);

  // Status counts for the filter pills (unfiltered by the current status).
  const counts = await db.feedback.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const countByStatus = new Map(
    counts.map((c) => [c.status as FeedbackStatusValue, c._count._all]),
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function href(overrides: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    if (status) sp.set("status", status);
    if (q) sp.set("q", q);
    for (const [k, v] of Object.entries(overrides)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    const qs = sp.toString();
    return `/admin/feedback${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-zinc-900">Feedback</h1>
          <p className="text-sm text-zinc-500">
            Messages sent through the storefront contact dialog
            {q ? ` · matching “${q}”` : ""}
          </p>
        </div>
        {/* Search */}
        <form
          action="/admin/feedback"
          method="get"
          className="flex items-center gap-2"
        >
          {status && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Search email or message…"
            className="h-9 w-56 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-point-500"
          />
          <button
            type="submit"
            className="h-9 rounded-md bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Search
          </button>
        </form>
      </div>

      {/* Status filter pills */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterPill
          href={href({ status: undefined, page: undefined })}
          active={!status}
          label="All"
          count={Object.values(countByStatus).reduce((s, n) => s + n, 0)}
        />
        {STATUSES.map((s) => (
          <FilterPill
            key={s}
            href={href({ status: s, page: undefined })}
            active={status === s}
            label={FEEDBACK_STATUS_LABELS[s]}
            count={countByStatus.get(s) ?? 0}
          />
        ))}
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-12 text-center">
            <p className="text-sm text-zinc-500">No feedback found.</p>
          </div>
        ) : (
          items.map((f) => (
            <article
              key={f.id}
              className={`rounded-2xl border bg-white p-5 ${
                f.status === "NEW"
                  ? "border-amber-200"
                  : "border-zinc-100"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-zinc-900">{f.email}</span>
                    <span className="text-xs text-zinc-400">
                      {formatDateTime(f.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
                    {f.message}
                  </p>

                  {(f.errorName || f.errorMessage || f.errorDigest) && (
                    <details className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      <summary className="cursor-pointer select-none font-medium">
                        Error trace attached
                        {f.errorUrl ? ` · ${f.errorUrl}` : ""}
                      </summary>
                      <dl className="mt-2 space-y-1 break-all font-mono text-[11px]">
                        {f.errorName && (
                          <div>
                            <dt className="inline font-semibold">name: </dt>
                            <dd className="inline">{f.errorName}</dd>
                          </div>
                        )}
                        {f.errorDigest && (
                          <div>
                            <dt className="inline font-semibold">digest: </dt>
                            <dd className="inline">{f.errorDigest}</dd>
                          </div>
                        )}
                        {f.errorMessage && (
                          <div>
                            <dt className="inline font-semibold">message: </dt>
                            <dd className="inline">{f.errorMessage}</dd>
                          </div>
                        )}
                        {f.userAgent && (
                          <div>
                            <dt className="inline font-semibold">user-agent: </dt>
                            <dd className="inline">{f.userAgent}</dd>
                          </div>
                        )}
                        {f.ip && (
                          <div>
                            <dt className="inline font-semibold">ip: </dt>
                            <dd className="inline">{f.ip}</dd>
                          </div>
                        )}
                      </dl>
                    </details>
                  )}
                </div>
                <FeedbackStatusSelect
                  id={f.id}
                  status={f.status as FeedbackStatusValue}
                />
              </div>
            </article>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <FeedbackPagination
          page={page}
          totalPages={totalPages}
          total={total}
          status={status}
          q={q}
        />
      )}
    </div>
  );
}

function FilterPill({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <a
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-point-500 text-white"
          : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
      }`}
    >
      {label} ({count})
    </a>
  );
}

function FeedbackPagination({
  page,
  totalPages,
  total,
  status,
  q,
}: {
  page: number;
  totalPages: number;
  total: number;
  status: string;
  q: string;
}) {
  function href(p: number) {
    const sp = new URLSearchParams();
    if (status) sp.set("status", status);
    if (q) sp.set("q", q);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `/admin/feedback${qs ? `?${qs}` : ""}`;
  }
  const pages = pageList(page, totalPages);

  return (
    <div className="mt-6 flex flex-col items-center gap-2">
      <p className="text-sm text-zinc-500">
        Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}{" "}
        of {total}
      </p>
      <div className="flex items-center gap-1">
        {page > 1 && (
          <a
            href={href(page - 1)}
            className="inline-flex h-9 items-center justify-center rounded border border-zinc-200 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            Prev
          </a>
        )}
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-2 text-sm text-zinc-400">
              …
            </span>
          ) : (
            <a
              key={p}
              href={href(p)}
              aria-current={p === page ? "page" : undefined}
              className={`inline-flex h-9 min-w-9 items-center justify-center rounded border px-3 text-sm ${
                p === page
                  ? "border-point-500 bg-point-500 font-semibold text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {p}
            </a>
          ),
        )}
        {page < totalPages && (
          <a
            href={href(page + 1)}
            className="inline-flex h-9 items-center justify-center rounded border border-zinc-200 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            Next
          </a>
        )}
      </div>
    </div>
  );
}