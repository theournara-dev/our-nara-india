"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { ImageField } from "@/components/admin/image-field";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { notify } from "@/lib/toast";
import { slugify } from "@/lib/slug";
import {
  deleteCategory,
  moveCategory,
  saveCategory,
  type CategoryActionResult,
} from "@/app/admin/categories/actions";

export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  image: string | null;
  sortOrder: number;
  isActive: boolean;
  /** Products assigned to this mid-level category. */
  productCount: number;
}

const inputCls =
  "h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500";

/**
 * Category-tree editor: top-level categories with their mid-level children.
 * Products keep a top-level category and sit in 0..n mid-level categories, so
 * this page owns the storefront's header menu and its listing tabs.
 */
export function CategoriesManager({
  categories,
}: {
  categories: AdminCategory[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingUnder, setAddingUnder] = useState<string | null>(null);

  const roots = useMemo(
    () => categories.filter((c) => c.parentId === null),
    [categories],
  );
  const childrenOf = (id: string) =>
    categories.filter((c) => c.parentId === id);

  function run(action: () => Promise<CategoryActionResult>, success: string) {
    setMessage(null);
    startTransition(async () => {
      const id = notify.loading("Saving…");
      const result = await action();
      if (!result.ok) {
        setMessage(result.message);
        notify.error(id, "Categories", result.message);
        return;
      }
      notify.success(id, success);
      router.refresh();
    });
  }

  return (
    <div>
      {message && (
        <div className="mb-4 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {message}
        </div>
      )}

      <div className="space-y-4">
        {roots.map((root) => (
          <section
            key={root.id}
            className="rounded-2xl border border-zinc-100 bg-white"
          >
            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
              <CategoryRow
                category={root}
                pending={pending}
                editing={editingId === root.id}
                onEdit={() => setEditingId(root.id)}
                onCancel={() => setEditingId(null)}
                onSave={(input) =>
                  run(
                    () => saveCategory({ ...input, id: root.id }),
                    "Category saved",
                  )
                }
                onMove={(dir) =>
                  run(() => moveCategory(root.id, dir), "Category moved")
                }
                onDelete={() => setDeleteTarget(root)}
                childCount={childrenOf(root.id).length}
              />
            </div>

            <ul className="divide-y divide-zinc-100">
              {childrenOf(root.id).map((child) => (
                <li key={child.id} className="px-4 py-3 pl-10">
                  <CategoryRow
                    category={child}
                    pending={pending}
                    editing={editingId === child.id}
                    onEdit={() => setEditingId(child.id)}
                    onCancel={() => setEditingId(null)}
                    onSave={(input) =>
                      run(
                        () => saveCategory({ ...input, id: child.id }),
                        "Subcategory saved",
                      )
                    }
                    onMove={(dir) =>
                      run(
                        () => moveCategory(child.id, dir),
                        "Subcategory moved",
                      )
                    }
                    onDelete={() => setDeleteTarget(child)}
                  />
                </li>
              ))}
            </ul>

            <div className="border-t border-zinc-100 px-4 py-3 pl-10">
              {addingUnder === root.id ? (
                <CategoryForm
                  pending={pending}
                  parentId={root.id}
                  parentName={root.name}
                  onCancel={() => setAddingUnder(null)}
                  onSubmit={(input) =>
                    run(() => saveCategory(input), "Subcategory added")
                  }
                  onDone={() => setAddingUnder(null)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingUnder(root.id)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-point-600 hover:text-point-700"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Add subcategory to {root.name}
                </button>
              )}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-8 rounded-2xl border border-dashed border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">
          Add a top-level category
        </h2>
        <CategoryForm
          pending={pending}
          onSubmit={(input) => run(() => saveCategory(input), "Category added")}
        />
      </section>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.name ?? "category"}?`}
        message="This cannot be undone. Categories still used by products or subcategories are refused."
        confirmLabel="Delete"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          const target = deleteTarget;
          setDeleteTarget(null);
          if (target) run(() => deleteCategory(target.id), "Category deleted");
        }}
      />
    </div>
  );
}

/** One editable category line (view mode ↔ edit mode). */
function CategoryRow({
  category,
  pending,
  editing,
  onEdit,
  onCancel,
  onSave,
  onMove,
  onDelete,
  childCount,
}: {
  category: AdminCategory;
  pending: boolean;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (input: Record<string, unknown>) => void;
  onMove: (direction: "up" | "down") => void;
  onDelete: () => void;
  childCount?: number;
}) {
  if (editing) {
    return (
      <CategoryForm
        pending={pending}
        category={category}
        onCancel={onCancel}
        onSubmit={onSave}
      />
    );
  }

  return (
    <div className="flex w-full items-center gap-3">
      {category.image ? (
        <Image
          src={category.image}
          alt=""
          width={36}
          height={36}
          unoptimized
          className="h-9 w-9 shrink-0 rounded-full border border-zinc-100 object-cover"
        />
      ) : (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-dashed border-zinc-200 text-[10px] text-zinc-400">
          {category.name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-zinc-900">
            {category.name}
          </span>
          {!category.isActive && (
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Hidden
            </span>
          )}
        </div>
        <div className="truncate text-xs text-zinc-400">
          /{category.slug}
          {childCount != null && ` · ${childCount} subcategories`}
          {category.productCount > 0 &&
            ` · ${category.productCount} product${
              category.productCount === 1 ? "" : "s"
            }`}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {/* The category page's banner pair + long carousel are managed in the
            Banners admin, scoped to this category. */}
        {category.parentId === null && (
          <Link
            href={`/admin/banners?category=${category.id}`}
            title="Manage this category page's banners"
            aria-label="Page banners"
            className="grid h-8 w-8 place-items-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <ImageIcon className="h-4 w-4" aria-hidden />
          </Link>
        )}
        <button
          type="button"
          aria-label="Move up"
          onClick={() => onMove("up")}
          disabled={pending}
          className="grid h-8 w-8 place-items-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <ChevronUp className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Move down"
          onClick={() => onMove("down")}
          disabled={pending}
          className="grid h-8 w-8 place-items-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <ChevronDown className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Edit"
          onClick={onEdit}
          className="grid h-8 w-8 place-items-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <Pencil className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Delete"
          onClick={onDelete}
          className="grid h-8 w-8 place-items-center rounded text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** Create/edit form for one category. */
function CategoryForm({
  category,
  parentId,
  parentName,
  pending,
  onSubmit,
  onCancel,
  onDone,
}: {
  category?: AdminCategory;
  parentId?: string;
  parentName?: string;
  pending: boolean;
  onSubmit: (input: Record<string, unknown>) => void;
  onCancel?: () => void;
  onDone?: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [image, setImage] = useState(category?.image ?? "");
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [slugTouched, setSlugTouched] = useState(Boolean(category));

  const effectiveSlug = slugTouched ? slug : slugify(name);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const finalSlug = effectiveSlug.trim();
    if (!name.trim() || !finalSlug) {
      notify.error("Categories", "A name is required.");
      return;
    }
    onSubmit({
      name: name.trim(),
      slug: finalSlug,
      parentId: parentId ?? category?.parentId ?? "",
      image: image.trim(),
      sortOrder: category?.sortOrder ?? 999,
      isActive,
    });
    onDone?.();
  }

  return (
    <form
      onSubmit={submit}
      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 p-3"
    >
      <div className="grid gap-2 md:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-500">
            Name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Masks & Patches"
            className={inputCls}
            autoFocus
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-500">
            Slug (URL)
          </span>
          <input
            value={effectiveSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder="masks-patches"
            className={inputCls}
          />
        </label>
        <div className="flex items-end gap-3 pb-0.5">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 accent-point-500"
            />
            Shown on the storefront
          </label>
        </div>
      </div>

      {parentName && (
        <p className="mt-2 text-xs text-zinc-500">
          Sits under <span className="font-medium">{parentName}</span>
        </p>
      )}

      <div className="mt-3">
        <ImageField
          label="Tile image (listing page)"
          value={image}
          onChange={setImage}
          hint="Round tile shown in the mid-level row on listing pages. Empty shows the name."
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center rounded bg-point-500 px-4 text-sm font-semibold text-white hover:bg-point-600 disabled:opacity-60"
        >
          {category ? "Save" : "Add"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center gap-1 rounded px-2 text-sm text-zinc-500 hover:text-zinc-800"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
