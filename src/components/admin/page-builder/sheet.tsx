"use client";

import { useLayoutEffect, useState } from "react";
import type { ReactNode } from "react";

/**
 * Right-side settings sheet (drawer). Used by the page builder for editing
 * section settings and configurations.
 *
 * It's a fixed, viewport-height modal so the header (title) and footer
 * (actions) stay pinned and the body scrolls independently — Save/Cancel are
 * always visible regardless of how long the page is. It stays "inside the
 * body": the panel and scrim start below the storefront header (measured from
 * the header's bottom edge), so the header is never covered.
 */
export function Sheet({
  title,
  subtitle,
  onClose,
  footer,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
  /** Wider panel for content-heavy editors (e.g. many slides/panels). */
  wide?: boolean;
}) {
  // The admin content starts below the storefront header. Measure the header's
  // bottom edge (in viewport coords) so the sheet fills the viewport below it.
  // useLayoutEffect avoids a flash of the sheet at the very top on open.
  const [top, setTop] = useState(0);

  useLayoutEffect(() => {
    function update() {
      const header = document.body.firstElementChild as HTMLElement | null;
      setTop(header ? Math.max(0, header.getBoundingClientRect().bottom) : 0);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50">
      {/* Scrim — starts below the header so it stays inside the body. */}
      <div
        className="absolute inset-x-0 bottom-0 bg-black/40"
        style={{ top }}
        onClick={onClose}
        aria-hidden
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`sheet-in absolute right-0 flex flex-col bg-white shadow-2xl ${
          wide ? "w-full max-w-xl" : "w-full max-w-md"
        }`}
        style={{ top, bottom: 0 }}
      >
        <header className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-zinc-900">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-zinc-400">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
          >
            ✕
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer && (
          <footer className="border-t border-zinc-100 px-5 py-4">{footer}</footer>
        )}
      </div>
    </div>
  );
}
