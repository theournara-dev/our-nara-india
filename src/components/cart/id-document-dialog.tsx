"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Photo-ID gate shown when a global (international) customer tries to place an
 * order. The image is uploaded via the public /api/upload/id-document route —
 * stored, not verified — and the returned URL is handed back to the sheet,
 * which records it on the order for staff review. Cancelling closes the dialog
 * and leaves the cart and the quick-purchase sheet untouched.
 */
export function IdDocumentDialog({
  onCancel,
  onUploaded,
}: {
  onCancel: () => void;
  onUploaded: (url: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Close on Escape, matching the admin dialogs. Blocked while uploading so a
  // stray keypress can't orphan an in-flight upload.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !uploading) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, uploading]);

  // Object URLs pin the picked file in memory until the preview changes/unmounts.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function pick(next: File | undefined) {
    setError(null);
    if (!next) return;
    if (!next.type.startsWith("image/")) {
      setError("Please choose an image file (PNG, JPEG, WebP or AVIF).");
      return;
    }
    if (next.size > MAX_BYTES) {
      setError("Image is too large. Maximum size is 5MB.");
      return;
    }
    setFile(next);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(next);
    });
  }

  async function submit() {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/id-document", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Upload failed. Please try again.");
      }
      onUploaded(data.url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Upload failed. Please try again.",
      );
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm"
        onClick={uploading ? undefined : onCancel}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Upload photo ID"
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h3 className="text-lg font-semibold text-zinc-900">
          Photo ID required
        </h3>
        <p className="mt-1 text-sm text-zinc-500">
          International orders are reviewed before shipping, so we need a photo
          of your ID (passport, national ID or driving licence). It is stored
          with your order and never shared.
        </p>

        <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50/50 p-3">
          {preview ? (
            <div className="flex items-center gap-3">
              <Image
                src={preview}
                alt="Selected ID image"
                width={64}
                height={64}
                unoptimized
                className="h-16 w-16 rounded border border-zinc-200 object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-zinc-700">{file?.name}</p>
                <p className="text-xs text-zinc-400">
                  {file ? `${(file.size / 1024 / 1024).toFixed(2)}MB` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex h-9 shrink-0 items-center rounded border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
              >
                Change
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-8 text-sm text-zinc-500 transition-colors hover:border-point-500 hover:text-point-500"
            >
              <span className="text-2xl" aria-hidden>
                🪪
              </span>
              <span className="mt-2 font-medium">Choose an ID image</span>
              <span className="mt-0.5 text-xs text-zinc-400">
                PNG, JPEG, WebP or AVIF · up to 5MB
              </span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              pick(e.target.files?.[0]);
              // Allow re-picking the same file (change only fires on a new value).
              e.target.value = "";
            }}
            className="hidden"
            aria-label="ID document image"
          />
        </div>

        {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={uploading}
            className="h-9 rounded border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!file || uploading}
            className="h-9 flex-1 rounded bg-point-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Upload & place order"}
          </button>
        </div>
      </div>
    </div>
  );
}
