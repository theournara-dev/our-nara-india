"use client";

import type { ReactNode } from "react";

/**
 * Right-side settings sheet (drawer). Used by the page builder for editing
 * section settings and configurations. The body scrolls independently while
 * the header (title) and footer (actions) stay fixed, so tall configs don't
 * push the Save/Cancel buttons off screen.
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
  return (
    <div className="absolute inset-0 z-50">
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`sheet-in absolute right-0 top-0 flex h-full flex-col bg-white shadow-2xl ${
          wide ? "w-full max-w-xl" : "w-full max-w-md"
        }`}
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
