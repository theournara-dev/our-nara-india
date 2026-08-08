"use client";

import { useEffect, useRef, useState } from "react";
import { COUNTRIES, type Country } from "@/data/countries";
import { cn } from "@/lib/utils";

type Props = {
  value: string; // country code or name
  onChange: (country: Country | undefined) => void;
  className?: string;
};

/** Searchable country dropdown: click to open, type to filter, Esc/click-outside to close. */
export function CountrySelect({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = COUNTRIES.find(
    (c) => c.code === value || c.name === value,
  );

  const results = COUNTRIES.filter((c) =>
    `${c.name} ${c.code} ${c.phone}`.toLowerCase().includes(query.toLowerCase()),
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
        <span className={selected ? "" : "text-zinc-400"}>
          {selected ? `${selected.name} (${selected.phone})` : "Select a country"}
        </span>
        <svg
          viewBox="0 0 20 20"
          className={cn("h-4 w-4 text-zinc-400 transition-transform", open && "rotate-180")}
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
              placeholder="Search country…"
              className="h-9 w-full rounded border border-[#e9e9e9] bg-white px-3 text-sm text-[#222] outline-none focus:border-point-500"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {results.length === 0 && (
              <li className="px-3 py-2 text-sm text-zinc-400">No countries found</li>
            )}
            {results.map((country) => (
              <li key={country.code}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(country);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-50",
                    selected?.code === country.code && "font-medium text-point-500",
                  )}
                >
                  <span>{country.name}</span>
                  <span className="text-xs text-zinc-400">{country.phone}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
