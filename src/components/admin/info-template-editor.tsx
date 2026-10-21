"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  InfoRowsEditor,
  type InfoRowDraft,
} from "@/components/admin/info-rows-editor";
import { saveInfoTemplate } from "@/app/admin/products/info-actions";
import type { SiteVersion } from "@/lib/site-version";

const STORES: { key: SiteVersion; label: string }[] = [
  { key: "local", label: "India (our-nara.com)" },
  { key: "global", label: "International (our-nara.co.kr)" },
];

export function InfoTemplateEditor({
  initial,
}: {
  initial: Record<SiteVersion, InfoRowDraft[]>;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<SiteVersion>("local");
  const [rows, setRows] = useState<Record<SiteVersion, InfoRowDraft[]>>(initial);
  const [confirmCopy, setConfirmCopy] = useState(false);
  const [pending, startTransition] = useTransition();
  const current = rows[tab];
  const other: SiteVersion = tab === "local" ? "global" : "local";

  function setCurrent(next: InfoRowDraft[]) {
    setRows((prev) => ({ ...prev, [tab]: next }));
  }

  /** Replace this store's list with a copy of the other store's list. */
  function copyFromOther() {
    if (!rows[other].length) return;
    if (current.length) {
      setConfirmCopy(true);
      return;
    }
    setCurrent(rows[other].map((r) => ({ ...r })));
  }

  function save() {
    startTransition(async () => {
      const toastId = notify.loading("Saving INFO content…");
      try {
        await saveInfoTemplate(tab, current);
        notify.success(toastId, "INFO content saved");
        router.refresh();
      } catch (err) {
        notify.error(
          toastId,
          "Save failed",
          err instanceof Error ? err.message : "Try again.",
        );
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 p-1">
        {STORES.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === key
                ? "bg-white text-point-600 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-zinc-100 bg-white p-5">
        <InfoRowsEditor
          key={tab}
          rows={current}
          onChange={setCurrent}
          emptyHint="No INFO content yet. Add sections like PAYMENT, SHIPPING, RETURNS & EXCHANGES."
        />
      </section>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="h-10 rounded bg-point-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save INFO content"}
        </button>
        <button
          type="button"
          onClick={copyFromOther}
          disabled={pending || rows[other].length === 0}
          className="h-10 rounded border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
        >
          Copy from {other === "local" ? "India" : "International"}
        </button>
        <span className="text-sm text-zinc-400">
          Shown on every product in{" "}
          {tab === "local" ? "the India" : "the International"} store unless the
          product sets its own rows.
        </span>
      </div>

      <ConfirmDialog
        open={confirmCopy}
        title="Replace this store's INFO content?"
        message={`Every section in the ${
          tab === "local" ? "India" : "International"
        } default will be replaced by a copy of the ${
          other === "local" ? "India" : "International"
        } default. Save afterwards to keep the change.`}
        confirmLabel="Replace"
        onConfirm={() => {
          setCurrent(rows[other].map((r) => ({ ...r })));
          setConfirmCopy(false);
        }}
        onCancel={() => setConfirmCopy(false)}
      />
    </div>
  );
}
