"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  PopupSurface,
  type PopupCardData,
} from "@/components/popups/popup-card";
import { nextDuePopup } from "@/lib/popups";
import type { SwitcherContent } from "@/lib/site-content";

type Popup = PopupCardData & {
  id: string;
  frequency: string;
  delaySeconds: number;
  timeoutSeconds: number;
};

const SESSION_KEY = "ournara:seen-popups";
const SUPPRESS_KEY = "ournara:popup-suppressed";

/** Popup ids already shown during this browser session ("once" frequency). */
function seenThisSession(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function markSeen(id: string) {
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify([...seenThisSession(), id]),
    );
  } catch {
    // ignore storage errors (private mode)
  }
}

/** Per-id timestamp of the last "don't show again today" / "once a day" show. */
function suppressedAt(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(SUPPRESS_KEY) ?? "{}") as Record<
      string,
      number
    >;
  } catch {
    return {};
  }
}

function suppress(id: string, at: number) {
  try {
    localStorage.setItem(
      SUPPRESS_KEY,
      JSON.stringify({ ...suppressedAt(), [id]: at }),
    );
  } catch {
    // ignore storage errors
  }
}

/**
 * Fetches the active popups and shows them one after another: the queue is
 * walked in order and each popup is dismissed (or auto-closes) before the next
 * one appears, so several active popups never fight over the screen.
 *
 * Per popup the visitor's settings are honoured — delay before it appears,
 * auto-close timeout, "once per session" / "once a day" / "every visit"
 * frequency, the "don't show again today" footer link, overlay dimming and
 * click-outside closing. Kept client-side so the root layout stays static.
 *
 * `switcher` is the store-picker content, handed to popups whose content kind
 * is "store-picker" so they render the same cards as the store switcher.
 *
 * Popups are a storefront feature: inside /admin they are skipped, so the
 * dashboard is never covered by a live campaign while it is being edited.
 */
export function PopupHost({ switcher }: { switcher?: SwitcherContent }) {
  const pathname = usePathname();
  const inAdmin = pathname?.startsWith("/admin") ?? false;
  const [queue, setQueue] = useState<Popup[]>([]);
  const [current, setCurrent] = useState<Popup | null>(null);
  const [ready, setReady] = useState(false);
  // Popups already put on screen during this page load, so "every visit"
  // popups still only show once per visit and the queue always advances.
  const [shownThisLoad, setShownThisLoad] = useState<Set<string>>(new Set());
  // The configured delay applies to the first popup of a visit only; the rest
  // follow as soon as the previous one is dismissed.
  const firstShow = useRef(true);
  const currentRef = useRef<Popup | null>(null);
  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  useEffect(() => {
    if (inAdmin) return;
    let cancelled = false;
    fetch("/api/popups", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { popups?: Popup[] }) => {
        if (cancelled) return;
        setQueue(data.popups ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [inAdmin]);

  const dismiss = useCallback((popup: Popup) => {
    const now = Date.now();
    if (popup.frequency === "once") markSeen(popup.id);
    if (popup.frequency === "day") suppress(popup.id, now);
    setCurrent(null);
  }, []);

  const hideToday = useCallback((popup: Popup) => {
    // "Don't show again today" always wins, whatever the frequency is.
    suppress(popup.id, Date.now());
    setCurrent(null);
  }, []);

  // Show the next due popup whenever nothing is on screen.
  useEffect(() => {
    if (inAdmin || !ready || current) return;
    const now = Date.now();
    const seen = new Set([...seenThisSession(), ...shownThisLoad]);
    const next = nextDuePopup(queue, seen, suppressedAt(), now);
    if (!next) return;

    const delayMs = firstShow.current
      ? Math.max(0, next.delaySeconds) * 1000
      : 0;
    const show = () => {
      firstShow.current = false;
      setShownThisLoad((prev) => new Set(prev).add(next.id));
      setCurrent(next);
    };
    if (delayMs === 0) {
      show();
      return;
    }
    const timer = setTimeout(show, delayMs);
    return () => clearTimeout(timer);
  }, [inAdmin, ready, queue, current, shownThisLoad]);

  // Auto-close the visible popup after its timeout (0 = waits for the visitor).
  useEffect(() => {
    if (!current || current.timeoutSeconds <= 0) return;
    const timer = setTimeout(
      () => dismiss(current),
      current.timeoutSeconds * 1000,
    );
    return () => clearTimeout(timer);
  }, [current, dismiss]);

  // Escape closes the visible popup, like any other dialog.
  useEffect(() => {
    if (inAdmin || !current) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && currentRef.current) dismiss(currentRef.current);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, dismiss, inAdmin]);

  if (inAdmin || !current) return null;

  return (
    <PopupSurface
      data={current}
      switcher={switcher}
      onClose={() => dismiss(current)}
      onHideToday={() => hideToday(current)}
    />
  );
}
