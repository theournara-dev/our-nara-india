"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import { submitQuestion } from "@/app/actions/qa";

/**
 * "Ask a question" modal for the Q&A tab. Only signed-in users see the button;
 * the resulting question is stored PENDING and hidden until an admin adds it.
 */
export function AskQuestionDialog({
  open,
  productId,
  onClose,
}: {
  open: boolean;
  productId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const toastId = notify.loading("Sending your question…");
      try {
        await submitQuestion({ productId, question });
        notify.success(
          toastId,
          "Question sent",
          "We'll answer it as soon as we can.",
        );
        setQuestion("");
        onClose();
        router.refresh();
      } catch (err) {
        notify.error(
          toastId,
          "Could not send",
          err instanceof Error ? err.message : "Try again.",
        );
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm"
        onClick={pending ? undefined : onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ask a question"
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h3 className="text-lg font-semibold text-zinc-900">Ask a question</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Our team will review it and publish it with an answer.
        </p>
        <form onSubmit={submit} className="mt-4">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={4}
            required
            placeholder="What would you like to know about this product?"
            className="w-full rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-point-500"
          />
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="h-10 rounded border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="h-10 flex-1 rounded bg-point-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
            >
              {pending ? "Sending…" : "Send question"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
