"use client";

import { useState } from "react";
import {
  SECTION_TYPE_META,
  type SectionType,
} from "@/lib/page-builder/types";
import { SelectField } from "./fields";

/**
 * Modal for adding a new section: pick a type, then it's appended to the end
 * of the page (drag it into place afterwards).
 */
export function AddSectionDialog({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (type: SectionType) => void;
}) {
  const [type, setType] = useState<SectionType>("product-grid");
  const meta = SECTION_TYPE_META.find((m) => m.type === type);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-zinc-900">Add section</h2>
        <SelectField
          label="Section type"
          value={type}
          onChange={(v) => setType(v as SectionType)}
          options={SECTION_TYPE_META.map((m) => ({
            value: m.type,
            label: m.label,
          }))}
        />
        {meta?.description && (
          <p className="mt-2 text-sm text-zinc-400">{meta.description}</p>
        )}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={() => onAdd(type)}
            className="h-10 rounded bg-point-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-point-600"
          >
            Add section
          </button>
          <button
            onClick={onClose}
            className="h-10 rounded border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
