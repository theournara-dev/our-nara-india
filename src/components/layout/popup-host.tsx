"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Popup = {
  id: string;
  title: string | null;
  body: string | null;
  image: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  placement: string; // "center" | "bottom"
  frequency: string; // "once" | "every"
};

const SESSION_KEY = "ournara:seen-popups";

/** Ids already shown this session, used to respect "once" frequency. */
function seenIds(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function markSeen(id: string) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...seenIds(), id]));
  } catch {
    // ignore storage errors
  }
}

/**
 * Fetches active popups and shows them as an overlay. Renders nothing when
 * there are no active popups or the visitor has already seen them this session.
 * Kept client-side so the root layout stays static.
 */
export function PopupHost() {
  const [popups, setPopups] = useState<Popup[]>([]);
  const [current, setCurrent] = useState<Popup | null>(null);
  const [loaded, setLoaded] = useState(false);

  const pickNext = useCallback(
    (list: Popup[], skipId?: string): Popup | null => {
      const seen = new Set(seenIds());
      const eligible = list.filter(
        (p) => p.id !== skipId && (p.frequency === "every" || !seen.has(p.id)),
      );
      return eligible[0] ?? null;
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    // Send the current path so the server only returns popups when the popup
    // feature is enabled for this brand/product page.
    const path = encodeURIComponent(window.location.pathname);
    fetch(`/api/popups?path=${path}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { popups?: Popup[] }) => {
        if (cancelled) return;
        const list = data.popups ?? [];
        setPopups(list);
        setCurrent(pickNext(list));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [pickNext]);

  function close() {
    if (!current) return;
    if (current.frequency === "once") markSeen(current.id);
    setCurrent(pickNext(popups, current.id));
  }

  // Don't block interaction if nothing is showing.
  if (!loaded || !current) return null;

  const hasLink = Boolean(current.ctaLabel && current.ctaHref);
  const inner = (
    <div className="relative w-full overflow-hidden rounded-2xl bg-white shadow-2xl">
      {current.image && (
        <Image
          src={current.image}
          alt={current.title ?? "Popup"}
          width={640}
          height={400}
          unoptimized
          className="h-auto w-full object-cover"
        />
      )}
      <div className="p-6">
        {current.title && (
          <h2 className="text-lg font-semibold text-zinc-900">
            {current.title}
          </h2>
        )}
        {current.body && (
          <p className="mt-1 text-sm text-zinc-600">{current.body}</p>
        )}
        {hasLink && (
          <Link
            href={current.ctaHref!}
            onClick={close}
            className="mt-4 inline-flex h-10 items-center justify-center rounded bg-point-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-point-600"
          >
            {current.ctaLabel}
          </Link>
        )}
      </div>
      <button
        type="button"
        onClick={close}
        aria-label="Close popup"
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900/40 text-white hover:bg-zinc-900/60"
      >
        ✕
      </button>
    </div>
  );

  if (current.placement === "bottom") {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 p-4">
        <div className="mx-auto w-full max-w-xl">{inner}</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm"
        onClick={close}
        aria-hidden
      />
      <div className="relative w-full max-w-lg">{inner}</div>
    </div>
  );
}
