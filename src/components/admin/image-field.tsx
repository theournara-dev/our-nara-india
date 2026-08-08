"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { isValidImageUrl } from "@/lib/blob";
import { notify } from "@/lib/toast";

const inputCls =
  "h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500";

/**
 * Reusable admin image picker: paste an image URL, upload a file, or clear. The
 * preview + URL stay in sync with the `value` controlled by the parent form.
 */
export function ImageField({
  value,
  onChange,
  label,
  hint,
  aspect = "thumb",
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  hint?: string;
  aspect?: "thumb" | "wide";
}) {
  const [urlInput, setUrlInput] = useState(value);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function addUrl() {
    const v = urlInput.trim();
    if (!v) return;
    if (!isValidImageUrl(v)) {
      notify.error(
        "Invalid image URL",
        "Use a public http(s) image URL ending in .png, .jpg, .gif, .webp or .avif.",
      );
      return;
    }
    onChange(v);
    setUrlInput(v);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const toastId = notify.loading("Uploading image…");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", {
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
      onChange(data.url!);
      setUrlInput(data.url!);
      notify.success(toastId, "Image uploaded");
    } catch (err) {
      notify.error(
        toastId,
        "Upload failed",
        err instanceof Error ? err.message : "Try again.",
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const previewCls =
    aspect === "wide"
      ? "h-12 w-32 rounded object-cover"
      : "h-12 w-12 rounded object-cover";

  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3">
      {hint && (
        <p className="mb-2 text-xs text-zinc-400">{hint}</p>
      )}
      <div className="mb-2 flex items-center gap-3">
        {value ? (
          <Image
            src={value}
            alt={label}
            width={aspect === "wide" ? 128 : 48}
            height={48}
            unoptimized
            className={previewCls}
          />
        ) : (
          <div className={previewCls} />
        )}
        <span className="text-xs text-zinc-400">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="Paste image URL…"
          className={inputCls}
        />
        <button
          type="button"
          onClick={addUrl}
          className="inline-flex h-9 shrink-0 items-center rounded border border-zinc-200 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          Set URL
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={(e) => onFile(e.target.files?.[0])}
          className="hidden"
          aria-label={`Upload ${label}`}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex h-9 shrink-0 items-center rounded bg-point-500 px-3 text-sm font-medium text-white hover:bg-point-600 disabled:opacity-60"
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setUrlInput("");
            }}
            className="inline-flex h-9 shrink-0 items-center rounded px-2 text-sm text-zinc-500 hover:text-rose-600"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
