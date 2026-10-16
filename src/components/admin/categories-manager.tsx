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
  setCategoryBanners,
  type CategoryActionResult,
} from "@/app/admin/categories/actions";
import {
  PLACEMENT_LABELS,
  type BannerPlacement,
} from "@/app/admin/banners/lib";

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
  /** This page's top-pair picks (placement "category-top"), in slot order. */
  topBannerIds: string[];
  /** This page's long-carousel picks (placement "category-long"), in order. */
  longBannerIds: string[];
}

/** One banner the category page pickers can choose from. */
export interface AdminBannerOption {
  id: string;
  title: string;
  image: string;
  placement: string;
  /** The category page it sits on right now; null when it sits elsewhere. */
  categoryId: string | null;
}

const inputCls =
  "h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-point-500";

/**
 * Category-tree editor: top-level categories with their mid-level children.
 * Products keep a top-level category and sit in 0..n mid-level categories, so
 * this page owns the storefront's header menu, its listing tabs and each
 * top-level listing page's banners.
 */
export function CategoriesManager({
  categories,
  banners,
}: {
  categories: AdminCategory[];
  /** Every banner, offered by each category's page-banner pickers. */
  banners: AdminBannerOption[];
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
                categories={categories}
                banners={banners}
                pending={pending}
                editing={editingId === root.id}
                onEdit={() => setEditingId(root.id)}
                onCancel={() => setEditingId(null)}
                onSave={(input, pageBanners) =>
                  run(async () => {
                    const saved = await saveCategory({ ...input, id: root.id });
                    if (!saved.ok || !pageBanners) return saved;
                    // The page picks save with the same Save and toast.
                    return setCategoryBanners(root.id, pageBanners);
                  }, "Category saved")
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
  categories,
  banners,
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
  /** Every category, so banner pickers can name the page a banner sits on. */
  categories?: AdminCategory[];
  /** Every banner, for a top-level category's page pickers. */
  banners?: AdminBannerOption[];
  pending: boolean;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (
    input: Record<string, unknown>,
    pageBanners?: { top: string[]; long: string[] },
  ) => void;
  onMove: (direction: "up" | "down") => void;
  onDelete: () => void;
  childCount?: number;
}) {
  if (editing) {
    return (
      <CategoryForm
        pending={pending}
        category={category}
        categories={categories}
        banners={banners}
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
        {/* Shortcut to this category's banners in the Banners admin, where a
            banner's image and text are edited; the page's picks are edited
            in this dialog's "Page banners" block. */}
        {category.parentId === null && (
          <Link
            href={`/admin/banners?category=${category.id}`}
            title="Open this category's banners in the Banners admin"
            aria-label="Category banners in the Banners admin"
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
  categories,
  banners,
  pending,
  onSubmit,
  onCancel,
  onDone,
}: {
  category?: AdminCategory;
  parentId?: string;
  parentName?: string;
  /** Every category, so banner pickers can name the page a banner sits on. */
  categories?: AdminCategory[];
  /** Every banner, for a top-level category's page pickers. */
  banners?: AdminBannerOption[];
  pending: boolean;
  onSubmit: (
    input: Record<string, unknown>,
    pageBanners?: { top: string[]; long: string[] },
  ) => void;
  onCancel?: () => void;
  onDone?: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [image, setImage] = useState(category?.image ?? "");
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [slugTouched, setSlugTouched] = useState(Boolean(category));
  const [topBannerIds, setTopBannerIds] = useState<string[]>(
    category?.topBannerIds.slice(0, 2) ?? [],
  );
  const [longBannerIds, setLongBannerIds] = useState<string[]>(
    category?.longBannerIds ?? [],
  );

  const effectiveSlug = slugTouched ? slug : slugify(name);
  // Only an existing top-level category has a page of its own to stock.
  const showPageBanners = Boolean(
    category && category.parentId === null && banners,
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const finalSlug = effectiveSlug.trim();
    if (!name.trim() || !finalSlug) {
      notify.error("Categories", "A name is required.");
      return;
    }
    onSubmit(
      {
        name: name.trim(),
        slug: finalSlug,
        parentId: parentId ?? category?.parentId ?? "",
        image: image.trim(),
        sortOrder: category?.sortOrder ?? 999,
        isActive,
      },
      showPageBanners ? { top: topBannerIds, long: longBannerIds } : undefined,
    );
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

      {showPageBanners && category && banners && (
        <PageBannersFields
          categoryId={category.id}
          banners={banners}
          categories={categories ?? []}
          top={topBannerIds}
          long={longBannerIds}
          onTopChange={setTopBannerIds}
          onLongChange={setLongBannerIds}
        />
      )}

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

/** Where a banner sits today, in words — null while it is on this page. */
function bannerHome(
  banner: AdminBannerOption,
  categoryId: string,
  categoryNames: Map<string, string>,
): string | null {
  if (banner.categoryId === categoryId) return null;
  if (banner.categoryId) {
    // Assigned to another page: picking it here moves it away.
    return categoryNames.get(banner.categoryId) ?? "another category";
  }
  // Not on a category page at all: name its current placement instead.
  return PLACEMENT_LABELS[banner.placement as BannerPlacement] ?? null;
}

/**
 * The page-banner pickers of one top-level category: the top pair rendered
 * side by side and the long carousel under it. Saved together with the
 * category form; the server moves banners that sit on another page.
 */
function PageBannersFields({
  categoryId,
  banners,
  categories,
  top,
  long,
  onTopChange,
  onLongChange,
}: {
  categoryId: string;
  banners: AdminBannerOption[];
  categories: AdminCategory[];
  top: string[];
  long: string[];
  onTopChange: (ids: string[]) => void;
  onLongChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const categoryNames = useMemo(
    () => new Map<string, string>(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const selectedLong = new Set(long);
  const filtered = banners.filter((b) =>
    b.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

  /** Set one of the two top slots ("" clears it) and keep the pair dense. */
  function setTopSlot(slot: 0 | 1, id: string) {
    const next = [top[0] ?? "", top[1] ?? ""];
    next[slot] = id;
    onTopChange(next.filter(Boolean));
  }

  /** Checkbox toggle; keeps the picks in list order (their carousel order). */
  function toggleLong(id: string) {
    const next = new Set(selectedLong);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onLongChange(banners.filter((b) => next.has(b.id)).map((b) => b.id));
  }

  return (
    <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-3">
      <h3 className="text-xs font-semibold text-zinc-700">Page banners</h3>
      <p className="mt-0.5 text-xs text-zinc-400">
        A banner can only sit on one category page; picking it here moves it.
      </p>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {([0, 1] as const).map((slot) => (
          <label key={slot} className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-500">
              Top banner {slot + 1}
            </span>
            <select
              value={top[slot] ?? ""}
              onChange={(e) => setTopSlot(slot, e.target.value)}
              className={inputCls}
            >
              <option value="">None</option>
              {banners.map((b) => {
                const home = bannerHome(b, categoryId, categoryNames);
                // The pair holds two slots: keep the sibling's pick out.
                const taken = slot === 0 ? top[1] : top[0];
                return (
                  <option key={b.id} value={b.id} disabled={b.id === taken}>
                    {home ? `${b.title} · ${home}` : b.title}
                  </option>
                );
              })}
            </select>
          </label>
        ))}
      </div>

      <div className="mt-3">
        <span className="mb-1 block text-xs font-medium text-zinc-500">
          Long carousel
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search banners…"
          className={inputCls}
        />
        {/* Scrollable like the page-builder pickers so the dialog stays small. */}
        <div className="mt-1 max-h-48 overflow-y-auto rounded border border-zinc-200">
          {filtered.length === 0 ? (
            <p className="px-2 py-2 text-xs text-zinc-400">No banners match.</p>
          ) : (
            filtered.map((b) => {
              const home = bannerHome(b, categoryId, categoryNames);
              return (
                <label
                  key={b.id}
                  className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedLong.has(b.id)}
                    onChange={() => toggleLong(b.id)}
                    className="h-4 w-4 rounded border-zinc-300 accent-point-500"
                  />
                  <Image
                    src={b.image}
                    alt=""
                    width={40}
                    height={24}
                    unoptimized
                    className="h-6 w-10 shrink-0 rounded object-cover"
                  />
                  <span className="min-w-0 flex-1 truncate">{b.title}</span>
                  {home && (
                    <span className="shrink-0 text-xs text-zinc-400">
                      {home}
                    </span>
                  )}
                </label>
              );
            })
          )}
        </div>
        <span className="mt-1 block text-xs text-zinc-400">
          {long.length} selected
        </span>
      </div>
    </div>
  );
}
