"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { isValidImageUrl } from "@/lib/blob";
import { notify } from "@/lib/toast";

const inputCls =
  "h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500";
const labelCls = "mb-1 block text-xs font-medium text-zinc-500";

/**
 * Paste-an-image-URL field with an upload button, used by the block editor.
 * Shares the `/api/admin/upload` endpoint with the product image manager.
 */
export function ImageUrlInput({
  value,
  onChange,
  label = "Image",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      onChange(data.url);
      notify.success(toastId, "Image uploaded");
    } catch (err) {
      notify.error(
        toastId,
        "Upload failed",
        err instanceof Error ? err.message : "Try a different file.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… or upload →"
          className={inputCls}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="h-9 shrink-0 rounded border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
        >
          {uploading ? "…" : "Upload"}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {value && isValidImageUrl(value) && (
        <Image
          src={value}
          alt=""
          width={96}
          height={96}
          unoptimized
          className="mt-2 h-20 w-auto rounded border border-zinc-100 object-cover"
        />
      )}
    </div>
  );
}
