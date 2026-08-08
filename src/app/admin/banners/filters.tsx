"use client";

import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";
import { PLACEMENT_LABELS, BANNER_PLACEMENTS } from "./lib";

export function BannerFilters({
  search,
  placement,
  active,
}: {
  search: string;
  placement: string;
  active: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const sp = new URLSearchParams();
    const s = String(fd.get("search") ?? "").trim();
    const p = String(fd.get("placement") ?? "");
    const a = String(fd.get("active") ?? "");
    if (s) sp.set("search", s);
    if (p) sp.set("placement", p);
    if (a) sp.set("active", a);
    const qs = sp.toString();
    startTransition(() => router.push(`/admin/banners${qs ? `?${qs}` : ""}`));
  }

  function clear() {
    startTransition(() => router.push("/admin/banners"));
  }

  const fieldCls =
    "h-9 rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900";

  return (
    <form
      ref={formRef}
      onSubmit={apply}
      className="mb-4 flex flex-wrap items-end gap-3"
    >
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-zinc-500">
          Search
        </span>
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder="Title…"
          className={`${fieldCls} w-56`}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-zinc-500">
          Placement
        </span>
        <select name="placement" defaultValue={placement} className={fieldCls}>
          <option value="">All placements</option>
          {BANNER_PLACEMENTS.map((p) => (
            <option key={p} value={p}>
              {PLACEMENT_LABELS[p]}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-zinc-500">
          Status
        </span>
        <select name="active" defaultValue={active} className={fieldCls}>
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 items-center justify-center rounded border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
      >
        {pending ? "Applying…" : "Apply"}
      </button>
      <button
        type="button"
        onClick={clear}
        disabled={pending}
        className="inline-flex h-9 items-center justify-center rounded px-3 text-sm text-zinc-500 hover:text-zinc-800 disabled:opacity-60"
      >
        {pending ? "Clearing…" : "Clear"}
      </button>
    </form>
  );
}
