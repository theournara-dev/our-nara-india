"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { isValidImageUrl } from "@/lib/blob";
import { notify } from "@/lib/toast";

const inputCls =
  "h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500";
const labelCls = "mb-1 block text-xs font-medium text-zinc-500";

/**
 * Editor for an ordered list of images (a product's gallery and a variant's
 * option images). Each thumbnail can be removed, an image can be promoted to
 * first place, and new images can be pasted or uploaded.
 */
export function ImageListField({
  value,
  onChange,
  label,
  hint,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  label: string;
  hint?: string;
}) {
  const [urlInput, setUrlInput] = useState("");
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
    onChange([...value, v]);
    setUrlInput("");
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
      onChange([...value, data.url!]);
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

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  /** Order matters (the first image leads the gallery), so let admins re-pick it. */
  function makeFirst(index: number) {
    const next = [...value];
    const [image] = next.splice(index, 1);
    onChange([image, ...next]);
  }

  return (
    <div>
      <span className={labelCls}>{label}</span>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {value.map((src, i) => (
            <div key={`${src}-${i}`} className="relative">
              <Image
                src={src}
                alt=""
                width={48}
                height={48}
                unoptimized
                className="h-12 w-12 rounded border border-zinc-200 object-cover"
              />
              {i === 0 && (
                <span className="absolute bottom-0 left-0 rounded-tr bg-point-500 px-1 text-[10px] font-semibold text-white">
                  Main
                </span>
              )}
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => makeFirst(i)}
                  title="Use as the first image"
                  aria-label="Use as the first image"
                  className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] text-zinc-700 shadow hover:bg-zinc-100"
                >
                  ★
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                title="Remove image"
                aria-label="Remove image"
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-xs text-white hover:bg-zinc-700"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addUrl();
            }
          }}
          placeholder="Paste image URL…"
          className={inputCls}
        />
        <button
          type="button"
          onClick={addUrl}
          className="inline-flex h-9 shrink-0 items-center rounded border border-zinc-200 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          Add URL
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
      </div>
      {hint && <span className="mt-1 block text-xs text-zinc-400">{hint}</span>}
    </div>
  );
}

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

  const picker = (
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
  );

  const preview = value ? (
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
  );

  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50/50 p-3">
      {hint && <p className="mb-2 text-xs text-zinc-400">{hint}</p>}
      <div className="mb-2 flex items-center gap-3">
        {preview}
        <span className="text-xs text-zinc-400">{label}</span>
      </div>
      {picker}
    </div>
  );
}
