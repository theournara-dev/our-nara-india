"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  copyQA,
  createQA,
  deleteQA,
  discardSubmission,
  getProductQAList,
  publishSubmission,
  reorderQA,
  searchProductsForQA,
  setQAVisible,
  updateQA,
} from "@/app/admin/products/qa-actions";

export interface QARow {
  id: string;
  question: string;
  answer: string | null;
  isVisible: boolean;
  source: string;
  status: string;
}

type ProductOption = {
  id: string;
  name: string;
  slug: string;
  qaCount: number;
};
type QAOption = { id: string; question: string; answer: string | null };

const inputCls =
  "h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500";
const areaCls =
  "w-full rounded border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-900 outline-none focus:border-point-500";

export function ProductQAEditor({
  productId,
  rows,
}: {
  productId: string;
  rows: QARow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ question: "", answer: "" });
  const [adding, setAdding] = useState(false);
  const [newQ, setNewQ] = useState({ question: "", answer: "" });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);

  const published = rows.filter((r) => r.status === "PUBLISHED");
  const submissions = rows.filter((r) => r.status === "PENDING");

  function run(
    label: string,
    fn: () => Promise<void>,
    onDone?: () => void,
  ) {
    startTransition(async () => {
      const t = notify.loading(label);
      try {
        await fn();
        notify.success(t, "Saved");
        onDone?.();
        router.refresh();
      } catch (err) {
        notify.error(
          t,
          "Action failed",
          err instanceof Error ? err.message : "Try again.",
        );
      }
    });
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= published.length) return;
    const ids = published.map((r) => r.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    run("Reordering…", () => reorderQA(productId, ids));
  }

  function startEdit(row: QARow) {
    setEditingId(row.id);
    setDraft({ question: row.question, answer: row.answer ?? "" });
  }

  return (
    <div className="space-y-8">
      {/* Published list */}
      <section className="rounded-2xl border border-zinc-100 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900">
            Published Q&amp;A ({published.length})
          </h2>
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="h-8 rounded border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
          >
            + Add Q&amp;A
          </button>
        </div>

        {adding && (
          <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <input
              value={newQ.question}
              onChange={(e) => setNewQ({ ...newQ, question: e.target.value })}
              placeholder="Question"
              className={`${inputCls} mb-2`}
            />
            <textarea
              value={newQ.answer}
              onChange={(e) => setNewQ({ ...newQ, answer: e.target.value })}
              placeholder="Answer (optional)"
              rows={3}
              className={`${areaCls} mb-2`}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  run(
                    "Adding…",
                    () =>
                      createQA(productId, {
                        question: newQ.question,
                        answer: newQ.answer,
                      }),
                    () => {
                      setNewQ({ question: "", answer: "" });
                      setAdding(false);
                    },
                  )
                }
                className="h-8 rounded bg-point-500 px-3 text-xs font-semibold text-white hover:bg-point-600 disabled:opacity-60"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="h-8 rounded border border-zinc-200 bg-white px-3 text-xs text-zinc-600 hover:bg-zinc-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {published.length === 0 ? (
          <p className="rounded border border-dashed border-zinc-200 px-3 py-6 text-center text-sm text-zinc-400">
            No Q&amp;A yet. Add one, or copy from another product.
          </p>
        ) : (
          <ul className="space-y-2">
            {published.map((row, i) => (
              <li
                key={row.id}
                className="rounded-lg border border-zinc-200 p-3"
              >
                {editingId === row.id ? (
                  <div>
                    <input
                      value={draft.question}
                      onChange={(e) =>
                        setDraft({ ...draft, question: e.target.value })
                      }
                      className={`${inputCls} mb-2`}
                    />
                    <textarea
                      value={draft.answer}
                      onChange={(e) =>
                        setDraft({ ...draft, answer: e.target.value })
                      }
                      rows={3}
                      className={`${areaCls} mb-2`}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(
                            "Saving…",
                            () => updateQA(row.id, draft),
                            () => setEditingId(null),
                          )
                        }
                        className="h-8 rounded bg-point-500 px-3 text-xs font-semibold text-white hover:bg-point-600 disabled:opacity-60"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="h-8 rounded border border-zinc-200 bg-white px-3 text-xs text-zinc-600 hover:bg-zinc-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-800">
                        {row.question}
                      </p>
                      <p className="mt-1 whitespace-pre-line text-sm text-zinc-500">
                        {row.answer || (
                          <span className="italic text-zinc-400">
                            No answer yet
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label="Move up"
                        disabled={i === 0 || pending}
                        onClick={() => move(i, -1)}
                        className="h-7 w-7 rounded border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label="Move down"
                        disabled={i === published.length - 1 || pending}
                        onClick={() => move(i, 1)}
                        className="h-7 w-7 rounded border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          run("Updating…", () =>
                            setQAVisible(row.id, !row.isVisible),
                          )
                        }
                        className={`h-7 rounded border px-2 text-xs font-medium ${
                          row.isVisible
                            ? "border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >
                        {row.isVisible ? "Visible" : "Hidden"}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        className="h-7 rounded border border-zinc-200 px-2 text-xs text-zinc-700 hover:bg-zinc-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(row.id)}
                        className="h-7 rounded border border-zinc-200 px-2 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Pending submissions */}
      {submissions.length > 0 && (
        <section className="rounded-2xl border border-amber-100 bg-amber-50/40 p-5">
          <h2 className="mb-4 text-sm font-semibold text-amber-800">
            Pending questions ({submissions.length})
          </h2>
          <ul className="space-y-2">
            {submissions.map((s) => (
              <li
                key={s.id}
                className="flex items-start gap-3 rounded-lg border border-amber-100 bg-white p-3"
              >
                <p className="min-w-0 flex-1 text-sm text-zinc-700">
                  {s.question}
                </p>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run("Publishing…", () => publishSubmission(s.id))
                    }
                    className="h-7 rounded bg-point-500 px-3 text-xs font-semibold text-white hover:bg-point-600 disabled:opacity-60"
                  >
                    Add to list
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run("Discarding…", () => discardSubmission(s.id))
                    }
                    className="h-7 rounded border border-zinc-200 bg-white px-3 text-xs text-zinc-600 hover:bg-zinc-100 disabled:opacity-60"
                  >
                    Discard
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <button
        type="button"
        onClick={() => setCopyOpen(true)}
        className="h-9 rounded border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
      >
        Copy Q&amp;A from another product
      </button>

      <CopyDialog
        open={copyOpen}
        productId={productId}
        onClose={() => setCopyOpen(false)}
        onCopied={() => {
          setCopyOpen(false);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete this Q&A?"
        message="It will be removed from the product page immediately."
        confirmLabel="Delete"
        busy={pending}
        onConfirm={() =>
          run("Deleting…", () => deleteQA(deleteId!), () => setDeleteId(null))
        }
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

function CopyDialog({
  open,
  productId,
  onClose,
  onCopied,
}: {
  open: boolean;
  productId: string;
  onClose: () => void;
  onCopied: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductOption[]>([]);
  const [source, setSource] = useState<ProductOption | null>(null);
  const [options, setOptions] = useState<QAOption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  async function doSearch() {
    setBusy(true);
    try {
      const rows = await searchProductsForQA(query);
      setResults(rows.filter((r) => r.id !== productId));
    } catch {
      notify.error("Search failed", "Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function chooseSource(p: ProductOption) {
    setSource(p);
    setSelected(new Set());
    setBusy(true);
    try {
      setOptions(await getProductQAList(p.id));
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function doCopy() {
    if (!source || selected.size === 0) return;
    setBusy(true);
    const t = notify.loading("Copying…");
    try {
      await copyQA(source.id, [...selected], productId);
      notify.success(t, `Copied ${selected.size} item(s)`);
      onCopied();
    } catch (err) {
      notify.error(
        t,
        "Copy failed",
        err instanceof Error ? err.message : "Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm"
        onClick={busy ? undefined : onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Copy Q&A"
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-5 shadow-2xl"
      >
        <h3 className="text-lg font-semibold text-zinc-900">Copy Q&amp;A</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Find a product and pick the questions to copy into this one.
        </p>

        <div className="mt-4 flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                doSearch();
              }
            }}
            placeholder="Search products…"
            className={inputCls}
          />
          <button
            type="button"
            disabled={busy}
            onClick={doSearch}
            className="h-9 shrink-0 rounded border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
          >
            Search
          </button>
        </div>

        <div className="mt-3 flex-1 overflow-y-auto">
          {source === null ? (
            <ul className="divide-y divide-zinc-100">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => chooseSource(p)}
                    className="flex w-full items-center justify-between px-1 py-2 text-left text-sm hover:bg-zinc-50"
                  >
                    <span className="text-zinc-800">{p.name}</span>
                    <span className="text-xs text-zinc-400">
                      {p.qaCount} item{p.qaCount === 1 ? "" : "s"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setSource(null)}
                className="mb-2 text-xs text-point-600 hover:underline"
              >
                ← {source.name}
              </button>
              {options.length === 0 ? (
                <p className="py-6 text-center text-sm text-zinc-400">
                  This product has no Q&amp;A.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {options.map((o) => (
                    <li key={o.id} className="flex gap-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(o.id)}
                        onChange={() => toggle(o.id)}
                        className="mt-1"
                      />
                      <div>
                        <p className="text-sm text-zinc-800">{o.question}</p>
                        {o.answer && (
                          <p className="text-xs text-zinc-500">{o.answer}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 border-t border-zinc-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-9 rounded border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={doCopy}
            disabled={busy || !source || selected.size === 0}
            className="h-9 rounded bg-point-500 px-4 text-sm font-semibold text-white hover:bg-point-600 disabled:opacity-60"
          >
            Copy {selected.size > 0 ? `(${selected.size})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
