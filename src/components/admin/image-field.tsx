"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { isValidImageUrl } from "@/lib/blob";
import { notify } from "@/lib/toast";
import {
  checkPickedFile,
  postFile,
  useUploadQueue,
} from "@/components/upload/upload-queue";

const inputCls =
  "h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500";
const labelCls = "mb-1 block text-xs font-medium text-zinc-500";
const pickBtnCls =
  "inline-flex h-9 shrink-0 items-center rounded bg-point-500 px-3 text-sm font-medium text-white hover:bg-point-600 disabled:opacity-60";

const ADMIN_UPLOAD_ENDPOINT = "/api/admin/upload";

/**
 * A picked file that hasn't been uploaded yet. Kept locally (with an object-URL
 * preview) until the surrounding form saves — see `upload-queue.tsx`.
 */
type PendingFile = {
  id: string;
  file: File;
  previewUrl: string;
};

/** Upload immediately. Only used when a field sits outside an upload queue. */
async function uploadNow(
  file: File,
  setUploading: (v: boolean) => void,
): Promise<string | null> {
  setUploading(true);
  const toastId = notify.loading("Uploading image…");
  try {
    const url = await postFile(ADMIN_UPLOAD_ENDPOINT, file);
    notify.success(toastId, "Image uploaded");
    return url;
  } catch (err) {
    notify.error(
      toastId,
      "Upload failed",
      err instanceof Error ? err.message : "Try again.",
    );
    return null;
  } finally {
    setUploading(false);
  }
}

/**
 * Editor for an ordered list of images (a product's gallery and a variant's
 * option images). Files picked here are held until the form saves; each
 * thumbnail can be removed and one can be promoted to first place.
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
  const queue = useUploadQueue();
  const fieldId = useId();
  const [urlInput, setUrlInput] = useState("");
  const [pending, setPending] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  // Mirrors the array the parent holds. Uploads land one after another inside a
  // single save, so appends read this instead of the (stale) `value` prop.
  const workingRef = useRef(value);
  const pendingRef = useRef(pending);
  useEffect(() => {
    onChangeRef.current = onChange;
    workingRef.current = value;
    pendingRef.current = pending;
  });

  // Drop anything still waiting when the editor goes away, so an abandoned
  // form never uploads and the queue doesn't keep a dead handler.
  useEffect(
    () => () => {
      for (const item of pendingRef.current) {
        queue?.unregister(item.id);
        URL.revokeObjectURL(item.previewUrl);
      }
    },
    [queue],
  );

  async function onFile(file: File | undefined) {
    if (!file) return;
    const problem = checkPickedFile(file, "image");
    if (problem) {
      notify.error("Unsupported file", problem);
      return;
    }
    if (!queue) {
      const url = await uploadNow(file, setUploading);
      if (url) onChangeRef.current([...value, url]);
      return;
    }
    const id = `${fieldId}-${pendingRef.current.length}-${Date.now()}`;
    const previewUrl = URL.createObjectURL(file);
    setPending((prev) => [...prev, { id, file, previewUrl }]);
    queue.register({
      id,
      file,
      endpoint: ADMIN_UPLOAD_ENDPOINT,
      apply: (url) => {
        setPending((prev) => {
          const item = prev.find((p) => p.id === id);
          if (item) URL.revokeObjectURL(item.previewUrl);
          return prev.filter((p) => p.id !== id);
        });
        const next = [...workingRef.current, url];
        workingRef.current = next;
        onChangeRef.current(next);
      },
    });
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function removePending(item: PendingFile) {
    queue?.unregister(item.id);
    URL.revokeObjectURL(item.previewUrl);
    setPending((prev) => prev.filter((p) => p.id !== item.id));
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
      {(value.length > 0 || pending.length > 0) && (
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
          {pending.map((item) => (
            <div
              key={item.id}
              className="relative"
              title="Uploads when you save"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.previewUrl}
                alt=""
                className="h-12 w-12 rounded border border-dashed border-point-400 object-cover opacity-80"
              />
              <span className="absolute bottom-0 left-0 rounded-tr bg-point-400 px-1 text-[10px] font-semibold text-white">
                New
              </span>
              <button
                type="button"
                onClick={() => removePending(item)}
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
          className={pickBtnCls}
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </div>
      {hint && <span className="mt-1 block text-xs text-zinc-400">{hint}</span>}
    </div>
  );

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
}

/**
 * Reusable admin image picker: paste an image URL, pick a file, or clear. A
 * picked file is held (and previewed) until the surrounding form saves. The
 * preview + URL stay in sync with the `value` controlled by the parent form.
 */
export function ImageField({
  value,
  onChange,
  label,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  hint?: string;
}) {
  const queue = useUploadQueue();
  const fieldId = useId();
  const [urlInput, setUrlInput] = useState(value);
  const [pending, setPending] = useState<PendingFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  });

  useEffect(
    () => () => {
      const item = pendingRef.current;
      if (item) {
        queue?.unregister(item.id);
        URL.revokeObjectURL(item.previewUrl);
      }
    },
    [queue],
  );

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
    const problem = checkPickedFile(file, "image");
    if (problem) {
      notify.error("Unsupported file", problem);
      return;
    }
    if (!queue) {
      const url = await uploadNow(file, setUploading);
      if (url) {
        onChangeRef.current(url);
        setUrlInput(url);
      }
      return;
    }
    // Replace any previously picked, still-unsaved file.
    if (pendingRef.current) {
      queue.unregister(pendingRef.current.id);
      URL.revokeObjectURL(pendingRef.current.previewUrl);
    }
    const id = `${fieldId}-${Date.now()}`;
    const previewUrl = URL.createObjectURL(file);
    setPending({ id, file, previewUrl });
    queue.register({
      id,
      file,
      endpoint: ADMIN_UPLOAD_ENDPOINT,
      apply: (url) => {
        setPending((prev) => {
          if (prev) URL.revokeObjectURL(prev.previewUrl);
          return null;
        });
        onChangeRef.current(url);
        setUrlInput(url);
      },
    });
  }

  function clear() {
    if (pending) {
      queue?.unregister(pending.id);
      URL.revokeObjectURL(pending.previewUrl);
      setPending(null);
    }
    onChange("");
    setUrlInput("");
  }

  const previewSrc = pending?.previewUrl ?? (value || undefined);

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
        className={pickBtnCls}
      >
        {uploading ? "Uploading…" : "Upload"}
      </button>
      {(value || pending) && (
        <button
          type="button"
          onClick={clear}
          className="inline-flex h-9 shrink-0 items-center rounded px-2 text-sm text-zinc-500 hover:text-rose-600"
        >
          Clear
        </button>
      )}
    </div>
  );

  const preview = previewSrc ? (
    <span className="relative inline-block">
      <Image
        src={previewSrc}
        alt={label}
        width={48}
        height={48}
        unoptimized
        className="h-12 w-12 rounded object-cover"
      />
      {pending && (
        <span className="absolute bottom-0 left-0 rounded-tr bg-point-400 px-1 text-[10px] font-semibold text-white">
          New
        </span>
      )}
    </span>
  ) : (
    <div className="h-12 w-12 rounded" />
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
