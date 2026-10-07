import Link from "next/link";
import type { AmbassadorStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/datetime";
import { AmbassadorReviewActions } from "./review-actions";
import {
  AMBASSADOR_STATUS_LABELS,
  AMBASSADOR_STATUS_STYLES,
  type AmbassadorStatusValue,
} from "./status";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const STATUSES = Object.keys(
  AMBASSADOR_STATUS_LABELS,
) as AmbassadorStatusValue[];

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
  status?: string;
  version?: string;
}>;

export default async function AdminAmbassadorsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  // Validate against the known enum — an arbitrary ?status= value would make
  // Prisma throw and crash the page.
  const status = (STATUSES as string[]).includes(params.status ?? "")
    ? (params.status as AmbassadorStatus)
    : "";
  // Site version filter (local = India, global = international).
  const version =
    params.version === "local" || params.version === "global"
      ? params.version
      : "";

  const where = {
    ...(status ? { status: status as AmbassadorStatus } : {}),
    ...(version ? { siteVersion: version } : {}),
  };

  const [applications, total] = await Promise.all([
    db.ambassadorApplication.findMany({
      where,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      orderBy: { createdAt: "desc" },
    }),
    db.ambassadorApplication.count({ where }),
  ]);

  // Counts for the status pills, scoped to the store filter so the numbers
  // still describe the list after switching versions.
  const counts = await db.ambassadorApplication.groupBy({
    by: ["status"],
    where: version ? { siteVersion: version } : {},
    _count: { _all: true },
  });
  const countByStatus = new Map(
    counts.map((c) => [c.status as AmbassadorStatusValue, c._count._all]),
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function href(overrides: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    if (status) sp.set("status", status);
    if (version) sp.set("version", version);
    for (const [k, v] of Object.entries(overrides)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    const qs = sp.toString();
    return `/admin/ambassadors${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900">
          Ambassadors
        </h1>
        <p className="text-sm text-zinc-500">
          Applications submitted through the storefront ambassador page
        </p>
      </div>

      {/* Status filter pills */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <FilterPill
          href={href({ status: undefined, page: undefined })}
          active={!status}
          label="All"
          count={[...countByStatus.values()].reduce((s, n) => s + n, 0)}
        />
        {STATUSES.map((s) => (
          <FilterPill
            key={s}
            href={href({ status: s, page: undefined })}
            active={status === s}
            label={AMBASSADOR_STATUS_LABELS[s]}
            count={countByStatus.get(s) ?? 0}
          />
        ))}
      </div>

      {/* Store-version filter */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
          Store
        </span>
        {(
          [
            { value: "", label: "All stores" },
            { value: "local", label: "Local (India)" },
            { value: "global", label: "Global" },
          ] as const
        ).map((opt) => (
          <Link
            key={opt.value || "all"}
            href={href({ version: opt.value || undefined, page: undefined })}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              version === opt.value
                ? "bg-point-500 text-white"
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {applications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-12 text-center">
            <p className="text-sm text-zinc-500">No applications found.</p>
          </div>
        ) : (
          applications.map((a) => {
            const statusValue = a.status as AmbassadorStatusValue;
            return (
              <article
                key={a.id}
                className={`rounded-2xl border bg-white p-5 ${
                  statusValue === "PENDING"
                    ? "border-amber-200"
                    : "border-zinc-100"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-zinc-900">
                        {a.name}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${AMBASSADOR_STATUS_STYLES[statusValue]}`}
                      >
                        {AMBASSADOR_STATUS_LABELS[statusValue]}
                      </span>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
                        {a.siteVersion === "global"
                          ? "Global"
                          : "Local (India)"}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {formatDateTime(a.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">
                      <a
                        href={`mailto:${a.email}`}
                        className="text-zinc-600 hover:text-point-500"
                      >
                        {a.email}
                      </a>
                      {a.phone ? ` · ${a.phone}` : ""}
                      {[a.country, a.city].filter(Boolean).length
                        ? ` · ${[a.country, a.city].filter(Boolean).join(", ")}`
                        : ""}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <SocialChip
                        label="Instagram"
                        value={a.instagram}
                        handleBase="https://instagram.com/"
                      />
                      <SocialChip
                        label="TikTok"
                        value={a.tiktok}
                        handleBase="https://tiktok.com/@"
                      />
                      <SocialChip
                        label="YouTube"
                        value={a.youtube}
                        handleBase="https://youtube.com/@"
                      />
                      <SocialChip label="Blog" value={a.blog} />
                    </div>

                    {(a.followers || a.audience) && (
                      <p className="mt-2 text-xs text-zinc-500">
                        {[
                          a.followers ? `Followers: ${a.followers}` : null,
                          a.audience ? `Audience: ${a.audience}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}

                    {a.motivation && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                          Motivation
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">
                          {a.motivation}
                        </p>
                      </div>
                    )}
                    {a.experience && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                          Experience
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">
                          {a.experience}
                        </p>
                      </div>
                    )}
                    {a.note && (
                      <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        <span className="font-semibold">Staff note:</span>{" "}
                        {a.note}
                      </p>
                    )}
                  </div>
                  <AmbassadorReviewActions
                    id={a.id}
                    name={a.name}
                    status={statusValue}
                    note={a.note}
                  />
                </div>
              </article>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <AmbassadorPagination
          page={page}
          totalPages={totalPages}
          total={total}
          status={status}
          version={version}
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
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-point-500 text-white"
          : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
      }`}
    >
      {label} ({count})
    </Link>
  );
}

/**
 * One social channel of an application. Socials are free text (handles or
 * URLs), so link only what is clearly addressable; anything else stays as
 * plain text for staff to copy.
 */
function SocialChip({
  label,
  value,
  handleBase,
}: {
  label: string;
  value: string | null;
  /** Profile prefix used when the value is an @handle. */
  handleBase?: string;
}) {
  const v = value?.trim();
  if (!v) return null;
  const href = /^https?:\/\//i.test(v)
    ? v
    : v.startsWith("@") && handleBase
      ? `${handleBase}${v.slice(1)}`
      : null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600">
      <span className="font-medium text-zinc-400">{label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-point-500 hover:underline"
        >
          {v}
        </a>
      ) : (
        v
      )}
    </span>
  );
}

function AmbassadorPagination({
  page,
  totalPages,
  total,
  status,
  version,
}: {
  page: number;
  totalPages: number;
  total: number;
  status: string;
  version: string;
}) {
  function href(p: number) {
    const sp = new URLSearchParams();
    if (status) sp.set("status", status);
    if (version) sp.set("version", version);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return `/admin/ambassadors${qs ? `?${qs}` : ""}`;
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
          <Link
            href={href(page - 1)}
            className="inline-flex h-9 items-center justify-center rounded border border-zinc-200 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            Prev
          </Link>
        )}
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-2 text-sm text-zinc-400">
              …
            </span>
          ) : (
            <Link
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
            </Link>
          ),
        )}
        {page < totalPages && (
          <Link
            href={href(page + 1)}
            className="inline-flex h-9 items-center justify-center rounded border border-zinc-200 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
