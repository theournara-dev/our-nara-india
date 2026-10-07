"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FeatureToggle } from "@/components/admin/feature-toggle";
import { notify } from "@/lib/toast";
import { deleteReview, toggleReviewVisible } from "@/app/admin/reviews/actions";

export interface AdminReviewRow {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  authorName: string;
  createdAt: string;
  isVisible: boolean;
  /** Customer photos attached to the review. */
  images: string[];
}

/**
 * Per-product review moderation shown inside the product edit page's Reviews
 * tab: hide/show or delete each review. New reviews are visible by default.
 */
export function ProductReviewsManager({
  reviews,
}: {
  reviews: AdminReviewRow[];
}) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const hidden = reviews.filter((r) => !r.isVisible).length;

  function onDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      const toastId = notify.loading("Deleting review…");
      try {
        await deleteReview(deleteId);
        notify.success(toastId, "Review deleted");
        setDeleteId(null);
        router.refresh();
      } catch (err) {
        notify.error(
          toastId,
          "Delete failed",
          err instanceof Error ? err.message : "Try again.",
        );
      }
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        {reviews.length} review{reviews.length === 1 ? "" : "s"} · {hidden}{" "}
        hidden. Reviews are visible by default; hide one to remove it from the
        product page.
      </p>

      {reviews.length === 0 ? (
        <p className="rounded border border-dashed border-zinc-200 px-3 py-8 text-center text-sm text-zinc-400">
          No reviews yet for this product.
        </p>
      ) : (
        <ul className="space-y-2">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-lg border border-zinc-200 p-3">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <span className="text-point-500">
                      {"★".repeat(r.rating)}
                      <span className="text-zinc-300">
                        {"★".repeat(5 - r.rating)}
                      </span>
                    </span>
                    <span className="font-medium text-zinc-700">
                      {r.authorName}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {r.createdAt.slice(0, 10)}
                    </span>
                  </div>
                  {r.title && (
                    <p className="mt-1 text-sm font-semibold text-zinc-800">
                      {r.title}
                    </p>
                  )}
                  {r.body && (
                    <p className="mt-0.5 line-clamp-3 text-sm text-zinc-600">
                      {r.body}
                    </p>
                  )}
                  {r.images.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.images.map((src) => (
                        <a
                          key={src}
                          href={src}
                          target="_blank"
                          rel="noreferrer"
                          title="Open photo"
                        >
                          <Image
                            src={src}
                            alt={`Photo by ${r.authorName}`}
                            width={56}
                            height={56}
                            unoptimized
                            className="h-14 w-14 rounded border border-zinc-200 object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <label className="flex items-center gap-2 text-xs text-zinc-500">
                    {r.isVisible ? "Visible" : "Hidden"}
                    <FeatureToggle
                      id={r.id}
                      checked={r.isVisible}
                      onChange={toggleReviewVisible}
                      label="Review visibility"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setDeleteId(r.id)}
                    className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete this review?"
        message="This permanently removes the review. To just hide it, use the visibility toggle instead."
        confirmLabel="Delete"
        busy={pending}
        onConfirm={onDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
