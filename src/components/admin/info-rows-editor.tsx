"use client";

export interface InfoRowDraft {
  heading: string;
  body: string;
  /** Whether the row shows on the storefront (global template ignores this). */
  visible: boolean;
}

const inputCls =
  "h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500";

/**
 * Repeater for INFO ("MORE INFORMATION") rows — a free list of
 * `{ heading, body }` sections. Used both for the storewide template and for a
 * product's own override.
 *
 * When `showVisibility` is set (per-product use), each row gets a "Show on
 * storefront" toggle so admins can keep the global sections but hide the ones
 * that don't apply.
 */
export function InfoRowsEditor({
  rows,
  onChange,
  emptyHint,
  showVisibility = false,
  headingPlaceholder = "Heading (e.g. SHIPPING)",
  bodyPlaceholder = "Body text…",
  addLabel = "+ Add section",
}: {
  rows: InfoRowDraft[];
  onChange: (rows: InfoRowDraft[]) => void;
  emptyHint?: string;
  showVisibility?: boolean;
  headingPlaceholder?: string;
  bodyPlaceholder?: string;
  addLabel?: string;
}) {
  const update = (i: number, patch: Partial<InfoRowDraft>) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const move = (i: number, dir: -1 | 1) => {
    const target = i + dir;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[i], next[target]] = [next[target], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {rows.length === 0 && (
        <p className="rounded border border-dashed border-zinc-200 px-3 py-6 text-center text-sm text-zinc-400">
          {emptyHint ?? "No sections yet."}
        </p>
      )}

      {rows.map((row, i) => (
        <div
          key={i}
          className={`rounded-lg border p-3 ${
            row.visible
              ? "border-zinc-200"
              : "border-dashed border-zinc-200 bg-zinc-50"
          }`}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-500">
              {showVisibility && (
                <input
                  type="checkbox"
                  checked={row.visible}
                  onChange={(e) => update(i, { visible: e.target.checked })}
                />
              )}
              {showVisibility
                ? row.visible
                  ? "Shown on storefront"
                  : "Hidden on storefront"
                : `Section ${i + 1}`}
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Move up"
                disabled={i === 0}
                onClick={() => move(i, -1)}
                className="h-7 w-7 rounded border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Move down"
                disabled={i === rows.length - 1}
                onClick={() => move(i, 1)}
                className="h-7 w-7 rounded border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => onChange(rows.filter((_, j) => j !== i))}
                className="h-7 rounded border border-zinc-200 px-2 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-red-600"
              >
                Remove
              </button>
            </div>
          </div>
          <input
            value={row.heading}
            onChange={(e) => update(i, { heading: e.target.value })}
            placeholder={headingPlaceholder}
            className={`${inputCls} mb-2`}
          />
          <textarea
            value={row.body}
            onChange={(e) => update(i, { body: e.target.value })}
            placeholder={bodyPlaceholder}
            rows={3}
            className="w-full rounded border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-900 outline-none focus:border-point-500"
          />
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          onChange([...rows, { heading: "", body: "", visible: true }])
        }
        className="h-8 rounded border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
      >
        {addLabel}
      </button>
    </div>
  );
}
