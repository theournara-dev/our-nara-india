"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import {
  SECTION_TYPE_META,
  type SectionType,
} from "@/lib/page-builder/types";
import { Sheet } from "./sheet";

/**
 * Right-side sheet for adding a section: pick a type, then it's appended to
 * the end of the page (drag it into place afterwards).
 */
export function AddSectionDialog({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (type: SectionType) => void;
}) {
  const [type, setType] = useState<SectionType>("product-showcase");

  return (
    <Sheet
      title="Add section"
      subtitle="Choose what kind of section to add"
      onClose={onClose}
      footer={
        <button
          onClick={() => onAdd(type)}
          className="h-10 w-full rounded bg-point-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-point-600"
        >
          Add section
        </button>
      }
    >
      <div className="space-y-2">
        {SECTION_TYPE_META.map((meta) => {
          const selected = meta.type === type;
          return (
            <button
              key={meta.type}
              type="button"
              onClick={() => setType(meta.type)}
              aria-pressed={selected}
              className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                selected
                  ? "border-point-500 bg-point-50"
                  : "border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <span
                className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  selected
                    ? "border-point-500 bg-point-500 text-white"
                    : "border-zinc-300"
                }`}
              >
                {selected && <Check size={12} />}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-zinc-900">
                  {meta.label}
                </span>
                {meta.description && (
                  <span className="mt-0.5 block text-xs text-zinc-400">
                    {meta.description}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
