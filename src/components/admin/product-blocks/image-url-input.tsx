"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { isValidImageUrl } from "@/lib/blob";
import { notify } from "@/lib/toast";
import { postFile, useUploadQueue } from "@/components/upload/upload-queue";

const inputCls =
  "h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500";
const labelCls = "mb-1 block text-xs font-medium text-zinc-500";

const ENDPOINT = "/api/admin/upload";

/**
 * Paste-an-image-URL field with an upload button, used by the block editor.
 * Shares the `/api/admin/upload` endpoint with the product image manager, and
 * like it holds a picked file until the form saves.
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
  const queue = useUploadQueue();
  const fieldId = useId();
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<{ id: string; name: string } | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const pendingRef = useRef(pending);
  useEffect(() => {
    onChangeRef.current = onChange;
    pendingRef.current = pending;
  });

  useEffect(
    () => () => {
      const item = pendingRef.current;
      if (item) queue?.unregister(item.id);
    },
    [queue],
  );

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!queue) {
      // Outside a queued form: upload straight away, as before.
      setUploading(true);
      const toastId = notify.loading("Uploading image…");
      try {
        onChangeRef.current(await postFile(ENDPOINT, file));
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
      return;
    }

    if (pendingRef.current) queue.unregister(pendingRef.current.id);
    const id = `${fieldId}-image`;
    setPending({ id, name: file.name });
    queue.register({
      id,
      file,
      endpoint: ENDPOINT,
      apply: (url) => {
        setPending(null);
        onChangeRef.current(url);
      },
    });
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
      {pending && !value && (
        <span className="mt-1 block text-xs text-zinc-500">
          {pending.name} · uploads on save
        </span>
      )}
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
