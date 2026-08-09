"use client";

import { useState, useTransition } from "react";
import { notify } from "@/lib/toast";
import { toDatetimeLocal } from "@/lib/datetime";
import {
  SECTION_TYPE_META_BY_TYPE,
  type PageSectionRow,
  type SectionType,
} from "@/lib/page-builder/types";
import { updateSection } from "@/app/admin/pages/actions";
import { ADMIN_SECTION_TYPES } from "./admin-registry";
import { Sheet } from "./sheet";
import { TextField, inputCls, type SectionFormOptions } from "./fields";

/**
 * Right-side sheet for editing a section: admin label, type-specific settings,
 * and visibility/schedule. Saves via a server action and reports the saved row
 * back so the builder can sync its list.
 */
export function SectionEditDialog({
  section,
  options,
  onClose,
  onSaved,
}: {
  section: PageSectionRow;
  options: SectionFormOptions;
  onClose: () => void;
  onSaved: (updated: PageSectionRow) => void;
}) {
  const meta = SECTION_TYPE_META_BY_TYPE[section.type as SectionType];
  const AdminForm = ADMIN_SECTION_TYPES[section.type as SectionType]?.adminForm;

  const [config, setConfig] = useState(section.config);
  const [title, setTitle] = useState(section.title ?? "");
  const [isActive, setIsActive] = useState(section.isActive);
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(section.startsAt));
  const [expiresAt, setExpiresAt] = useState(
    toDatetimeLocal(section.expiresAt),
  );
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const toastId = notify.loading("Saving…");
      try {
        const updated = await updateSection(section.id, {
          title,
          config,
          isActive,
          startsAt: startsAt || undefined,
          expiresAt: expiresAt || undefined,
        });
        notify.success(toastId, "Section saved");
        onSaved(updated);
      } catch (err) {
        notify.error(
          toastId,
          "Save failed",
          err instanceof Error ? err.message : "Try again.",
        );
      }
    });
  }

  return (
    <Sheet
      title={meta?.label ?? section.type}
      subtitle={section.title ?? "Untitled section"}
      onClose={onClose}
      wide
      footer={
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={pending}
            className="h-10 flex-1 rounded bg-point-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
          <button
            onClick={onClose}
            className="h-10 rounded border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <TextField
            label="Admin label"
            value={title}
            onChange={setTitle}
            hint="Internal name shown in the builder."
          />
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Settings
          </h3>
          {AdminForm ? (
            <AdminForm
              config={config}
              onChange={setConfig}
              options={options}
            />
          ) : (
            <p className="text-sm text-zinc-400">
              No settings for this section.
            </p>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Visibility
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-500">
                Starts at
              </span>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-zinc-500">
                Expires at
              </span>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className={inputCls}
              />
            </label>
          </div>
          <label className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 accent-point-500"
            />
            <span className="text-sm text-zinc-700">Active on storefront</span>
          </label>
        </div>
      </div>
    </Sheet>
  );
}
