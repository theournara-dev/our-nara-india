"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  filterMenuIcons,
  MENU_ICON_GROUPS,
  MENU_ICON_LABELS,
  type MenuIconGroup,
} from "@/lib/menu-icons";

/**
 * The admin's icon browser: library tabs, a search box, and one compact grid.
 * Ten libraries carry near-identical names (Home, Star, Heart…), so the search
 * spans every library at once and each tooltip names the library it comes from.
 */
export function MenuIconPicker({
  value,
  defaultKey,
  onChange,
}: {
  value: string;
  defaultKey: string;
  onChange: (key: string) => void;
}) {
  const [library, setLibrary] = useState<string>("all");
  const [query, setQuery] = useState("");

  const total = useMemo(
    () => MENU_ICON_GROUPS.reduce((sum, group) => sum + group.icons.length, 0),
    [],
  );

  const groups = useMemo(() => {
    const scoped =
      library === "all"
        ? MENU_ICON_GROUPS
        : MENU_ICON_GROUPS.filter((group) => group.id === library);
    return filterMenuIcons(scoped, query);
  }, [library, query]);

  const matches = groups.reduce((sum, entry) => sum + entry.icons.length, 0);
  const selectedLabel = MENU_ICON_LABELS[value] ?? value;
  const selectedGroup = MENU_ICON_GROUPS.find((group) =>
    group.icons.some((icon) => icon.key === value),
  );

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 p-2.5">
        <label className="relative min-w-40 flex-1">
          <span className="sr-only">Search icons</span>
          <Search
            size={14}
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${total} icons across ${MENU_ICON_GROUPS.length} libraries…`}
            className="h-8 w-full rounded-md border border-zinc-200 bg-white pl-8 pr-8 text-xs text-zinc-700 outline-none placeholder:text-zinc-400 focus:border-point-400"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-zinc-400 hover:text-zinc-700"
            >
              <X size={12} aria-hidden />
            </button>
          ) : null}
        </label>
        <span className="shrink-0 text-[11px] tabular-nums text-zinc-400">
          {matches === total
            ? `${total} icons`
            : `${matches} of ${total} icons`}
        </span>
      </div>

      <div
        role="tablist"
        aria-label="Icon libraries"
        className="flex gap-1 overflow-x-auto border-b border-zinc-100 p-2.5"
      >
        <LibraryTab
          active={library === "all"}
          label="All"
          count={total}
          onClick={() => setLibrary("all")}
        />
        {MENU_ICON_GROUPS.map((group) => (
          <LibraryTab
            key={group.id}
            active={library === group.id}
            label={group.shortLabel}
            count={group.icons.length}
            onClick={() => setLibrary(group.id)}
          />
        ))}
      </div>

      <div className="max-h-56 overflow-y-auto p-2.5">
        {groups.length ? (
          <div className="flex flex-wrap gap-1.5">
            {groups.map((entry: { group: MenuIconGroup; icons: MenuIconGroup["icons"] }) =>
              entry.icons.map(({ key, label, Icon }) => {
                const selected = value === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onChange(key)}
                    aria-pressed={selected}
                    aria-label={`${entry.group.label}: ${label}`}
                    title={`${label} · ${entry.group.label}`}
                    className={`grid h-8 w-8 place-items-center rounded border transition-colors ${
                      selected
                        ? "border-point-500 bg-point-50 text-point-600 ring-1 ring-point-500"
                        : "border-zinc-200 bg-white text-zinc-500 hover:border-point-300 hover:text-point-600"
                    }`}
                  >
                    <Icon size={16} aria-hidden />
                  </button>
                );
              }),
            )}
          </div>
        ) : (
          <p className="px-1 py-6 text-center text-xs text-zinc-400">
            No icons match {query ? `“${query}”` : "this library"}.
          </p>
        )}
      </div>

      <p className="flex items-center gap-1.5 border-t border-zinc-100 px-2.5 py-2 text-[11px] text-zinc-500">
        <span>Selected</span>
        <span className="font-medium text-zinc-700">{selectedLabel}</span>
        {selectedGroup ? (
          <span className="text-zinc-400">· {selectedGroup.label}</span>
        ) : null}
        {value !== defaultKey ? (
          <button
            type="button"
            onClick={() => onChange(defaultKey)}
            className="ml-auto rounded px-1.5 py-0.5 text-[11px] font-medium text-point-600 hover:bg-point-50"
          >
            Use default
          </button>
        ) : null}
      </p>
    </div>
  );
}

function LibraryTab({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
        active
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-800"
      }`}
    >
      {label}
      <span
        className={`ml-1 tabular-nums ${active ? "text-white/60" : "text-zinc-400"}`}
      >
        {count}
      </span>
    </button>
  );
}
