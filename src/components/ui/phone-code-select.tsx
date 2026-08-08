"use client";

import { useEffect, useRef, useState } from "react";
import { COUNTRIES } from "@/data/countries";
import { cn } from "@/lib/utils";

type Props = {
  value: string; // dialing code, e.g. "+91"
  onChange: (code: string) => void;
  className?: string;
};

/** All unique dialing codes across the country dataset, sorted numerically. */
const ALL_CODES = (() => {
  const set = new Set<string>();
  for (const c of COUNTRIES) if (c.phone) set.add(c.phone);
  return [...set].sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ""), 10) || 0;
    const nb = parseInt(b.replace(/\D/g, ""), 10) || 0;
    return na - nb;
  });
})();

/** Searchable dialing-code dropdown: click to open, type to filter, pick any code. */
export function PhoneCodeSelect({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = ALL_CODES.filter((code) =>
    code.toLowerCase().includes(query.toLowerCase()),
  );

  // Close on click outside or Escape.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setQuery("");
        }}
        className="flex h-11 w-full items-center justify-between rounded border border-[#e9e9e9] bg-white px-3 text-sm text-[#222] outline-none focus:border-point-500"
      >
        <span className={value ? "" : "text-zinc-400"}>{value || "Code"}</span>
        <svg
          viewBox="0 0 20 20"
          className={cn(
            "h-4 w-4 text-zinc-400 transition-transform",
            open && "rotate-180",
          )}
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-[#e9e9e9] bg-white shadow-[1px_1px_10px_rgba(0,0,0,0.1)]">
          <div className="border-b border-[#e9e9e9] p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search code…"
              className="h-9 w-full rounded border border-[#e9e9e9] bg-white px-3 text-sm text-[#222] outline-none focus:border-point-500"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {results.length === 0 && (
              <li className="px-3 py-2 text-sm text-zinc-400">
                No codes found
              </li>
            )}
            {results.map((code) => (
              <li key={code}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(code);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-50",
                    value === code && "font-medium text-point-500",
                  )}
                >
                  <span>{code}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
