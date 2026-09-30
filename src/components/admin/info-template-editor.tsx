"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import {
  InfoRowsEditor,
  type InfoRowDraft,
} from "@/components/admin/info-rows-editor";
import { saveInfoTemplate } from "@/app/admin/products/info-actions";

export function InfoTemplateEditor({ initial }: { initial: InfoRowDraft[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<InfoRowDraft[]>(initial);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const toastId = notify.loading("Saving INFO content…");
      try {
        await saveInfoTemplate(rows);
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
      <section className="rounded-2xl border border-zinc-100 bg-white p-5">
        <InfoRowsEditor
          rows={rows}
          onChange={setRows}
          emptyHint="No INFO content yet. Add sections like PAYMENT, SHIPPING, RETURNS & EXCHANGES."
        />
      </section>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="h-10 rounded bg-point-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save INFO content"}
        </button>
        <span className="text-sm text-zinc-400">
          Shown on every product unless the product sets its own override.
        </span>
      </div>
    </div>
  );
}
