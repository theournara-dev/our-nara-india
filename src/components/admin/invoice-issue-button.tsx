"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { issueOrderInvoice } from "@/app/admin/orders/actions";
import { notify } from "@/lib/toast";

/**
 * Fallback for orders that predate automatic invoicing: issue one on demand.
 * The action is idempotent, so a double click can never create a second
 * invoice for the order.
 */
export function InvoiceIssueButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function issue() {
    startTransition(async () => {
      const toastId = notify.loading("Issuing invoice…");
      try {
        const res = await issueOrderInvoice(orderId);
        if (!res.ok) {
          notify.error(toastId, "Could not issue invoice", res.message);
          return;
        }
        notify.success(toastId, "Invoice issued", res.number);
        router.refresh();
      } catch (err) {
        notify.error(
          toastId,
          "Could not issue invoice",
          err instanceof Error ? err.message : "Try again.",
        );
      }
    });
  }

  return (
    <button
      type="button"
      onClick={issue}
      disabled={pending}
      className="inline-flex h-7 items-center rounded-md border border-zinc-200 bg-white px-2.5 text-[11px] font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Issuing…" : "Issue invoice"}
    </button>
  );
}
