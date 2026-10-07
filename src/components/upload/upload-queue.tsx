"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { notify } from "@/lib/toast";
import {
  isAllowedImageSize,
  isAllowedImageType,
  isAllowedVideoSize,
  isAllowedVideoType,
} from "@/lib/blob";

/**
 * Deferred uploads for admin forms.
 *
 * Picking a file no longer uploads it: the field keeps the `File`, previews it
 * locally and registers it here. The form's save runs through `useUploadGate`,
 * which uploads everything waiting *first* and then re-runs the save so it
 * reads the fresh URLs — nothing reaches blob storage unless the admin actually
 * saves, and an abandoned form leaves no orphaned files behind.
 */

export type FlushResult = { ok: true } | { ok: false; error: string };

type PendingUpload = {
  id: string;
  file: File;
  /** Endpoint that stores the file and answers with `{ url }`. */
  endpoint: string;
  /** Called with the stored URL so the field can update its bound value. */
  apply: (url: string) => void;
};

type UploadQueue = {
  /** How many files are waiting to be uploaded. */
  count: number;
  register: (item: PendingUpload) => void;
  unregister: (id: string) => void;
  flush: () => Promise<FlushResult>;
};

const UploadQueueContext = createContext<UploadQueue | null>(null);

/** POST one file to an upload endpoint and return its stored URL. */
export async function postFile(endpoint: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(endpoint, { method: "POST", body: formData });
  const data = (await res.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
  };
  if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
  return data.url;
}

/**
 * Client-side check at pick time. The server validates again on upload, but by
 * then the file is being saved, so an obviously wrong one is worth rejecting
 * while the admin is still looking at the picker.
 */
export function checkPickedFile(
  file: File,
  kind: "image" | "video",
): string | null {
  if (kind === "video") {
    if (!isAllowedVideoType(file.type)) {
      return "Use MP4, WebM or MOV.";
    }
    if (!isAllowedVideoSize(file.size)) {
      return "Videos must be under 50MB.";
    }
    return null;
  }
  if (!isAllowedImageType(file.type)) {
    return "Use PNG, JPEG, GIF, WebP or AVIF.";
  }
  if (!isAllowedImageSize(file.size)) {
    return "Images must be under 5MB.";
  }
  return null;
}

export function UploadQueueProvider({ children }: { children: ReactNode }) {
  const items = useRef(new Map<string, PendingUpload>());
  const [count, setCount] = useState(0);
  const sync = useCallback(() => setCount(items.current.size), []);

  const register = useCallback(
    (item: PendingUpload) => {
      items.current.set(item.id, item);
      sync();
    },
    [sync],
  );

  const unregister = useCallback(
    (id: string) => {
      if (items.current.delete(id)) sync();
    },
    [sync],
  );

  const flush = useCallback(async (): Promise<FlushResult> => {
    for (const item of [...items.current.values()]) {
      try {
        const url = await postFile(item.endpoint, item.file);
        items.current.delete(item.id);
        sync();
        item.apply(url);
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Upload failed.",
        };
      }
    }
    return { ok: true };
  }, [sync]);

  const value = useMemo(
    () => ({ count, register, unregister, flush }),
    [count, register, unregister, flush],
  );

  return (
    <UploadQueueContext.Provider value={value}>
      {children}
    </UploadQueueContext.Provider>
  );
}

/** The surrounding queue, or null when the field isn't inside one. */
export function useUploadQueue(): UploadQueue | null {
  return useContext(UploadQueueContext);
}

/**
 * Gate a form's save on its pending uploads.
 *
 * `save(key)` uploads anything waiting, then saves again from the render that
 * carries the uploaded URLs: the handlers are re-registered on every render, so
 * the first registration after the uploads land is the one with fresh state.
 * (Re-running on a timer instead would race React's commit and save the old
 * values — the timer here is only a safety net if no render happens at all.)
 */
export function useUploadGate() {
  const queue = useUploadQueue();
  const handlers = useRef(new Map<string, () => void | Promise<void>>());
  const rerun = useRef<string | null>(null);
  const [running, setRunning] = useState(false);

  const registerHandler = (key: string, fn: () => void | Promise<void>) => {
    handlers.current.set(key, fn);
    if (rerun.current === key) {
      rerun.current = null;
      void fn();
    }
  };

  const save = useCallback(
    async (key: string) => {
      const handler = handlers.current.get(key);
      if (!handler) return;
      if (!queue || queue.count === 0) {
        await handler();
        return;
      }
      setRunning(true);
      const res = await queue.flush();
      setRunning(false);
      if (!res.ok) {
        notify.error("Upload failed", res.error);
        return;
      }
      rerun.current = key;
      setTimeout(() => {
        if (rerun.current === key) {
          rerun.current = null;
          void handlers.current.get(key)?.();
        }
      }, 2000);
    },
    [queue],
  );

  return { registerHandler, save, uploading: running };
}
