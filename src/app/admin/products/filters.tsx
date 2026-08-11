"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

export function ProductFilters({
  search,
  brand,
  category,
  active,
  brands,
  categories,
}: {
  search: string;
  brand: string;
  category: string;
  active: string;
  brands: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Which button triggered the current navigation, so only that button shows a
  // loading label (they share the single `pending` flag from useTransition).
  const [action, setAction] = useState<"apply" | "clear" | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const sp = new URLSearchParams();
    const s = String(fd.get("search") ?? "").trim();
    const b = String(fd.get("brand") ?? "");
    const c = String(fd.get("category") ?? "");
    const a = String(fd.get("active") ?? "");
    if (s) sp.set("search", s);
    if (b) sp.set("brand", b);
    if (c) sp.set("category", c);
    if (a) sp.set("active", a);
    const qs = sp.toString();
    setAction("apply");
    startTransition(() => router.push(`/admin/products${qs ? `?${qs}` : ""}`));
  }

  function clear() {
    setAction("clear");
    startTransition(() => router.push("/admin/products"));
  }

  const fieldCls =
    "h-9 rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900";

  return (
    <form
      key={`${search}|${brand}|${category}|${active}`}
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
          placeholder="Name or slug…"
          className={`${fieldCls} w-56`}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-zinc-500">
          Brand
        </span>
        <select name="brand" defaultValue={brand} className={fieldCls}>
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-zinc-500">
          Category
        </span>
        <select name="category" defaultValue={category} className={fieldCls}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
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
        {pending && action === "apply" ? "Applying…" : "Apply"}
      </button>
      <button
        type="button"
        onClick={clear}
        disabled={pending}
        className="inline-flex h-9 items-center justify-center rounded px-3 text-sm text-zinc-500 hover:text-zinc-800 disabled:opacity-60"
      >
        {pending && action === "clear" ? "Clearing…" : "Clear"}
      </button>
    </form>
  );
}
