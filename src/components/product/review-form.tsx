"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { notify } from "@/lib/toast";
import { MAX_REVIEW_IMAGES } from "@/lib/reviews";
import { submitReview } from "@/app/actions/reviews";

const inputCls =
  "h-10 w-full rounded border border-[#e9e9e9] bg-white px-3 text-sm text-[#222] outline-none focus:border-point-500";

/**
 * Signed-in customers write a review straight into the REVIEW tab: rating,
 * title, body and up to five photos. The author name and the date are recorded
 * server-side (name from the account, date at submission) and shown here so the
 * reviewer knows what is published alongside their words.
 */
export function ReviewForm({ productId }: { productId: string }) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const authorName = session?.user?.name?.trim() || "Your account";
  const today = new Date().toISOString().slice(0, 10);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_REVIEW_IMAGES - images.length;
    if (room <= 0) {
      notify.error(
        "photo-limit",
        "Photo limit reached",
        `A review can hold up to ${MAX_REVIEW_IMAGES} photos.`,
      );
      return;
    }
    setUploading(true);
    const tid = notify.loading("Uploading photos…");
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files).slice(0, room)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload/review-image", {
          method: "POST",
          body: formData,
        });
        const data = (await res.json().catch(() => ({}))) as {
          url?: string;
          error?: string;
        };
        if (!res.ok || !data.url) {
          throw new Error(data.error ?? "Upload failed");
        }
        uploaded.push(data.url);
      }
      setImages((prev) => [...prev, ...uploaded]);
      notify.success(tid, "Photos added");
    } catch (err) {
      notify.error(
        tid,
        "Upload failed",
        err instanceof Error ? err.message : "Try again.",
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

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
          images,
        });
        notify.success(toastId, "Thanks for your review!");
        setTitle("");
        setBody("");
        setRating(5);
        setImages([]);
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

      <p className="mb-3 text-xs text-[#888]">
        Posting as <span className="font-medium text-[#555]">{authorName}</span>{" "}
        · {today}
      </p>

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

      {/* Photos */}
      <div className="mb-3">
        <span className="mb-1 block text-xs font-medium text-[#888]">
          Photos (optional, up to {MAX_REVIEW_IMAGES})
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {images.map((src) => (
            <div key={src} className="relative">
              <Image
                src={src}
                alt=""
                width={64}
                height={64}
                unoptimized
                className="h-16 w-16 rounded border border-[#e9e9e9] object-cover"
              />
              <button
                type="button"
                onClick={() =>
                  setImages((prev) => prev.filter((s) => s !== src))
                }
                aria-label="Remove photo"
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-xs text-white hover:bg-zinc-700"
              >
                ×
              </button>
            </div>
          ))}
          {images.length < MAX_REVIEW_IMAGES && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex h-16 w-16 items-center justify-center rounded border border-dashed border-[#cfcfcf] text-xl text-[#999] hover:border-point-500 hover:text-point-500 disabled:opacity-50"
              aria-label="Add photos"
            >
              {uploading ? "…" : "+"}
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
        </div>
      </div>

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
          disabled={pending || uploading}
          className="h-10 flex-1 rounded bg-point-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
        >
          {pending ? "Submitting…" : "Submit review"}
        </button>
      </div>
    </form>
  );
}
