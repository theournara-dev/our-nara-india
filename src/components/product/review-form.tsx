"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import { submitReview } from "@/app/actions/reviews";

const inputCls =
  "h-10 w-full rounded border border-[#e9e9e9] bg-white px-3 text-sm text-[#222] outline-none focus:border-point-500";

/** Signed-in customers write a review straight into the REVIEW tab. */
export function ReviewForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const toastId = notify.loading("Submitting review…");
      try {
        await submitReview({
          productId,
          rating,
          title: title.trim() || undefined,
          body,
        });
        notify.success(toastId, "Thanks for your review!");
        setTitle("");
        setBody("");
        setRating(5);
        setOpen(false);
        router.refresh();
      } catch (err) {
        notify.error(
          toastId,
          "Could not submit",
          err instanceof Error ? err.message : "Try again.",
        );
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-ink px-5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-white"
      >
        Write a Review
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto max-w-xl rounded-xl border border-[#e9e9e9] p-5 text-left"
    >
      <p className="mb-3 text-sm font-semibold text-ink">Write a review</p>

      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm text-[#555]">Rating</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
            className={`text-xl leading-none ${
              n <= rating ? "text-point-500" : "text-zinc-300"
            }`}
          >
            ★
          </button>
        ))}
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (optional)"
        className={`${inputCls} mb-2`}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share your experience…"
        rows={4}
        required
        className="mb-3 w-full rounded border border-[#e9e9e9] bg-white px-3 py-2 text-sm text-[#222] outline-none focus:border-point-500"
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-10 rounded border border-[#e9e9e9] bg-white px-4 text-sm font-medium text-[#555] hover:bg-zinc-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="h-10 flex-1 rounded bg-point-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
        >
          {pending ? "Submitting…" : "Submit review"}
        </button>
      </div>
    </form>
  );
}
