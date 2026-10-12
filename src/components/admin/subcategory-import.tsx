"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import {
  applySubcategoryCsv,
  previewSubcategoryCsv,
  type CsvReport,
} from "@/app/admin/products/subcategory-actions";

const SAMPLE = `product slug, category, subcategory
cica-panthenol-soothing-cream, skin-care, facial-care
daiso-roll-type-cleansing-towel-20-sheets, skin-care, cleansing`;

const statusLabel: Record<string, string> = {
  ok: "Ready",
  "unknown-product": "Unknown product",
  "unknown-category": "Unknown category",
  "unknown-subcategory": "Unknown subcategory",
  "wrong-root": "Not under that category",
  unreadable: "Unreadable line",
};

/**
 * Bulk subcategory import. Paste (or drop) the client's CSV, preview what it
 * resolves to, then import. Each product the file mentions ends up with exactly
 * the subcategories listed for it, so the file is the source of truth and
 * re-importing the same file changes nothing.
 */
export function SubcategoryImport() {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [report, setReport] = useState<CsvReport | null>(null);
  const [pending, startTransition] = useTransition();

  function preview() {
    setReport(null);
    startTransition(async () => {
      const result = await previewSubcategoryCsv(csv);
      setReport(result);
      if (result.rows.length === 0) {
        notify.error("Import", "Nothing readable in that file.");
      }
    });
  }

  function apply() {
    startTransition(async () => {
      const toastId = notify.loading("Importing subcategories…");
      const result = await applySubcategoryCsv(csv);
      setReport(result);
      notify.success(
        toastId,
        "Import finished",
        `${result.summary.products} product${result.summary.products === 1 ? "" : "s"} updated, ${result.summary.assignments} assignment${result.summary.assignments === 1 ? "" : "s"}.`,
      );
      router.refresh();
    });
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    setCsv(text);
    setReport(null);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-100 bg-white p-4">
        <label className="mb-2 block text-sm font-medium text-zinc-700">
          CSV — one row per product&nbsp;↔&nbsp;subcategory
        </label>
        <textarea
          value={csv}
          onChange={(e) => {
            setCsv(e.target.value);
            setReport(null);
          }}
          rows={10}
          spellCheck={false}
          placeholder={SAMPLE}
          className="w-full rounded-lg border border-zinc-200 p-3 font-mono text-xs text-zinc-800 outline-none focus:border-point-500"
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="inline-flex h-9 cursor-pointer items-center rounded border border-zinc-200 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-50">
            Choose file…
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={(e) => void onFile(e.target.files?.[0])}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={preview}
            disabled={pending || !csv.trim()}
            className="inline-flex h-9 items-center rounded border border-zinc-200 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            Preview
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={pending || !csv.trim()}
            className="inline-flex h-9 items-center rounded bg-point-500 px-4 text-sm font-semibold text-white hover:bg-point-600 disabled:opacity-60"
          >
            {pending ? "Working…" : "Import"}
          </button>
          <button
            type="button"
            onClick={() => {
              setCsv("");
              setReport(null);
            }}
            className="inline-flex h-9 items-center rounded px-3 text-sm text-zinc-500 hover:text-zinc-800"
          >
            Clear
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          Columns: <span className="font-mono">product slug, category,
          subcategory</span>. A product with several subcategories appears on
          several rows. A header row and <span className="font-mono">#</span>{" "}
          comments are ignored. Import replaces the subcategories of every
          product the file mentions; products not in the file are untouched.
        </p>
      </div>

      {report && (
        <div className="rounded-2xl border border-zinc-100 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center gap-4 text-sm">
            <span className="font-medium text-zinc-900">
              {report.summary.products} product
              {report.summary.products === 1 ? "" : "s"} ·{" "}
              {report.summary.assignments} assignment
              {report.summary.assignments === 1 ? "" : "s"}
            </span>
            {report.summary.problems > 0 && (
              <span className="text-amber-600">
                {report.summary.problems} problem
                {report.summary.problems === 1 ? "" : "s"} (skipped)
              </span>
            )}
          </div>

          {report.parseErrors.length > 0 && (
            <ul className="mb-3 space-y-1 rounded-lg border border-amber-100 bg-amber-50 p-2 text-xs text-amber-800">
              {report.parseErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-[11px] uppercase tracking-wide text-zinc-400">
                  <th className="px-2 py-2 font-medium">Product</th>
                  <th className="px-2 py-2 font-medium">Subcategories</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr
                    key={row.productSlug}
                    className="border-b border-zinc-50 last:border-0"
                  >
                    <td className="px-2 py-1.5">
                      <div className="text-sm text-zinc-900">
                        {row.productName ?? row.productSlug}
                      </div>
                      <div className="font-mono text-[11px] text-zinc-400">
                        {row.productSlug}
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-sm text-zinc-600">
                      {row.subcategories.join(", ")}
                    </td>
                    <td className="px-2 py-1.5 text-sm">
                      <span
                        className={
                          row.status === "ok"
                            ? "text-emerald-600"
                            : "text-amber-600"
                        }
                      >
                        {statusLabel[row.status] ?? row.status}
                      </span>
                      {row.message && (
                        <span className="block text-[11px] text-zinc-400">
                          {row.message}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
