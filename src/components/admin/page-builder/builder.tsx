"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  GripVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { notify } from "@/lib/toast";
import {
  SECTION_TYPE_META_BY_TYPE,
  type PageRow,
  type PageSectionRow,
  type SectionType,
} from "@/lib/page-builder/types";
import {
  createSection,
  deleteSection,
  reorderSections,
  toggleSection,
} from "@/app/admin/pages/actions";
import type { SectionFormOptions } from "./fields";
import { AddSectionDialog } from "./add-section-dialog";
import { SectionEditDialog } from "./section-edit-dialog";

const iconBtn =
  "inline-flex h-8 w-8 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-500";

/**
 * The page-builder editor: an ordered, drag-and-drop list of sections with
 * up/down arrows, per-section edit / show-hide / delete, and an "Add section"
 * picker. Reorders and edits persist via server actions and revalidate the
 * storefront.
 */
export function PageBuilder({
  page,
  options,
}: {
  page: PageRow;
  options: SectionFormOptions;
}) {
  const [sections, setSections] = useState<PageSectionRow[]>(page.sections);
  const [editing, setEditing] = useState<PageSectionRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function persistOrder(next: PageSectionRow[]) {
    setSections(next);
    startTransition(async () => {
      const toastId = notify.loading("Saving order…");
      try {
        await reorderSections(
          page.id,
          next.map((s) => s.id),
        );
        notify.dismiss(toastId);
      } catch (err) {
        notify.error(
          toastId,
          "Reorder failed",
          err instanceof Error ? err.message : "Try again.",
        );
      }
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSections((items) => {
      const oldIndex = items.findIndex((s) => s.id === active.id);
      const newIndex = items.findIndex((s) => s.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return items;
      const next = arrayMove(items, oldIndex, newIndex);
      startTransition(async () => {
        const toastId = notify.loading("Saving order…");
        try {
          await reorderSections(
            page.id,
            next.map((s) => s.id),
          );
          notify.dismiss(toastId);
        } catch (err) {
          notify.error(
            toastId,
            "Reorder failed",
            err instanceof Error ? err.message : "Try again.",
          );
        }
      });
      return next;
    });
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    persistOrder(arrayMove(sections, index, target));
  }

  function handleToggle(section: PageSectionRow) {
    const nextActive = !section.isActive;
    setSections((items) =>
      items.map((s) =>
        s.id === section.id ? { ...s, isActive: nextActive } : s,
      ),
    );
    startTransition(async () => {
      const toastId = notify.loading("Updating…");
      try {
        await toggleSection(section.id, nextActive);
        notify.dismiss(toastId);
      } catch (err) {
        notify.error(
          toastId,
          "Update failed",
          err instanceof Error ? err.message : "Try again.",
        );
      }
    });
  }

  function handleDelete(section: PageSectionRow) {
    if (
      !window.confirm(`Delete the "${section.title ?? "section"}" section?`)
    ) {
      return;
    }
    setSections((items) => items.filter((s) => s.id !== section.id));
    startTransition(async () => {
      const toastId = notify.loading("Deleting…");
      try {
        await deleteSection(section.id);
        notify.dismiss(toastId);
      } catch (err) {
        notify.error(
          toastId,
          "Delete failed",
          err instanceof Error ? err.message : "Try again.",
        );
      }
    });
  }

  function handleAdd(type: SectionType) {
    startTransition(async () => {
      const toastId = notify.loading("Adding section…");
      try {
        const row = await createSection(page.id, type);
        setSections((items) => [...items, row]);
        notify.success(toastId, "Section added");
        setAdding(false);
      } catch (err) {
        notify.error(
          toastId,
          "Add failed",
          err instanceof Error ? err.message : "Try again.",
        );
      }
    });
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-zinc-900">
            Page builder
          </h1>
          <p className="text-sm text-zinc-500">
            {page.title} · {sections.length} section
            {sections.length === 1 ? "" : "s"} · drag to reorder
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="inline-flex h-9 items-center justify-center rounded bg-point-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-point-600"
        >
          + Add section
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={sections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {sections.length === 0 && (
              <div className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-400">
                No sections yet. Add one to start building this page.
              </div>
            )}
            {sections.map((section, index) => (
              <SortableRow
                key={section.id}
                section={section}
                index={index}
                total={sections.length}
                onEdit={() => setEditing(section)}
                onToggle={() => handleToggle(section)}
                onDelete={() => handleDelete(section)}
                onMove={move}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {editing && (
        <SectionEditDialog
          section={editing}
          options={options}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setSections((items) =>
              items.map((s) => (s.id === updated.id ? updated : s)),
            );
            setEditing(null);
          }}
        />
      )}
      {adding && (
        <AddSectionDialog onClose={() => setAdding(false)} onAdd={handleAdd} />
      )}
    </div>
  );
}

function SortableRow({
  section,
  index,
  total,
  onEdit,
  onToggle,
  onDelete,
  onMove,
}: {
  section: PageSectionRow;
  index: number;
  total: number;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onMove: (index: number, dir: -1 | 1) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const meta = SECTION_TYPE_META_BY_TYPE[section.type as SectionType];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-xl border bg-white p-3 ${
        isDragging
          ? "z-10 border-point-500 shadow-lg"
          : "border-zinc-100 shadow-sm"
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="cursor-grab touch-none text-zinc-400 hover:text-zinc-600 active:cursor-grabbing"
      >
        <GripVertical size={18} />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-900">
            {meta?.label ?? section.type}
          </span>
          {!section.isActive && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
              Hidden
            </span>
          )}
        </div>
        <div className="truncate text-xs text-zinc-400">
          {section.title ?? "Untitled"}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onMove(index, -1)}
          disabled={index === 0}
          aria-label="Move up"
          className={iconBtn}
        >
          <ChevronUp size={16} />
        </button>
        <button
          onClick={() => onMove(index, 1)}
          disabled={index === total - 1}
          aria-label="Move down"
          className={iconBtn}
        >
          <ChevronDown size={16} />
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onToggle}
          aria-label={section.isActive ? "Hide section" : "Show section"}
          className={iconBtn}
        >
          {section.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
        <button onClick={onEdit} aria-label="Edit section" className={iconBtn}>
          <Pencil size={16} />
        </button>
        <button
          onClick={onDelete}
          aria-label="Delete section"
          className={`${iconBtn} hover:bg-red-50 hover:text-red-600`}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
