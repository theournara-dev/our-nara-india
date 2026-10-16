"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseInput, safeText } from "@/lib/validation";

/**
 * Category-tree writes. The storefront reads the tree for its header menu and
 * its listing tabs, so every write clears the admin page and the storefront.
 */

export type CategoryActionResult =
  { ok: true } | { ok: false; message: string };

const categoryInput = z.object({
  name: safeText(120, { min: 1, message: "Name is required" }),
  slug: safeText(120, { min: 1, message: "Slug is required" }).refine(
    (v) => /^[a-z0-9-]+$/.test(v),
    { message: "Slug must be lowercase letters, numbers and hyphens" },
  ),
  /** Empty string / undefined = a top-level category. */
  parentId: z.string().optional(),
  image: safeText(500).optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

function revalidateCategories() {
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  // The header menu and the listing tabs follow the tree.
  revalidatePath("/", "layout");
}

/** Create a category, or save an existing one (id set). */
export async function saveCategory(
  input: { id?: string } & Record<string, unknown>,
): Promise<CategoryActionResult> {
  await requireAdmin();
  let data: z.infer<typeof categoryInput>;
  try {
    data = parseInput(categoryInput, input, "category");
  } catch {
    return { ok: false, message: "Check the name and slug." };
  }

  const parentId = data.parentId ? data.parentId : null;
  // Two levels only: a chosen parent must itself be a root, and a category
  // cannot be its own parent.
  if (parentId) {
    if (parentId === input.id) {
      return { ok: false, message: "A category cannot sit under itself." };
    }
    const parent = await db.category.findUnique({
      where: { id: parentId },
      select: { parentId: true },
    });
    if (!parent) return { ok: false, message: "That parent no longer exists." };
    if (parent.parentId) {
      return {
        ok: false,
        message: "Categories are two levels: pick a top-level parent.",
      };
    }
  }
  if (input.id && parentId) {
    const children = await db.category.count({ where: { parentId: input.id } });
    if (children > 0) {
      return {
        ok: false,
        message: "Move or delete this category's subcategories first.",
      };
    }
  }

  const fields = {
    name: data.name,
    slug: data.slug,
    parentId,
    image: data.image?.trim() ? data.image.trim() : null,
    sortOrder: data.sortOrder,
    isActive: data.isActive,
  };

  try {
    if (input.id) {
      await db.category.update({ where: { id: input.id }, data: fields });
    } else {
      await db.category.create({ data: fields });
    }
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      return { ok: false, message: "Another category already uses that slug." };
    }
    console.error("[categories] save failed:", err);
    return { ok: false, message: "Could not save the category." };
  }

  revalidateCategories();
  return { ok: true };
}

/** Delete a category. Refused while products or subcategories still use it. */
export async function deleteCategory(
  id: string,
): Promise<CategoryActionResult> {
  await requireAdmin();
  const category = await db.category.findUnique({
    where: { id },
    select: {
      name: true,
      _count: {
        select: { products: true, children: true, subcategoryLinks: true },
      },
    },
  });
  if (!category)
    return { ok: false, message: "This category no longer exists." };

  if (category._count.children > 0) {
    return {
      ok: false,
      message: `${category.name} still has ${category._count.children} subcategor${
        category._count.children === 1 ? "y" : "ies"
      }. Delete or move them first.`,
    };
  }
  if (category._count.subcategoryLinks > 0) {
    return {
      ok: false,
      message: `${category.name} is assigned to ${category._count.subcategoryLinks} product${
        category._count.subcategoryLinks === 1 ? "" : "s"
      }. Clear those assignments first.`,
    };
  }
  if (category._count.products > 0) {
    return {
      ok: false,
      message: `${category.name} is the top-level category of ${category._count.products} product${
        category._count.products === 1 ? "" : "s"
      }. Move them first.`,
    };
  }

  try {
    await db.category.delete({ where: { id } });
  } catch (err) {
    console.error(`[categories] delete failed for ${id}:`, err);
    return { ok: false, message: "Could not delete this category." };
  }

  revalidateCategories();
  return { ok: true };
}

/** Move a category one step up/down among its siblings (same parent). */
export async function moveCategory(
  id: string,
  direction: "up" | "down",
): Promise<CategoryActionResult> {
  await requireAdmin();
  const category = await db.category.findUnique({
    where: { id },
    select: { id: true, parentId: true },
  });
  if (!category)
    return { ok: false, message: "This category no longer exists." };

  const siblings = await db.category.findMany({
    where: { parentId: category.parentId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true },
  });
  const index = siblings.findIndex((s) => s.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= siblings.length) {
    return { ok: true }; // Already at the edge.
  }

  // Normalise the whole run so ties from older saves stop fighting.
  const order = siblings.map((s) => s.id);
  const [moved] = order.splice(index, 1);
  order.splice(target, 0, moved);
  try {
    await db.$transaction(
      order.map((siblingId, i) =>
        db.category.update({
          where: { id: siblingId },
          data: { sortOrder: i },
        }),
      ),
    );
  } catch (err) {
    console.error(`[categories] move failed for ${id}:`, err);
    return { ok: false, message: "Could not reorder the category." };
  }

  revalidateCategories();
  return { ok: true };
}

/**
 * Banner picks for one category page: the "top pair" rendered side by side
 * and the long carousel under it. Placement editing moved off the banner edit
 * form, so the category screen owns its page's banners. A banner sits on at
 * most one page (`categoryId` is a single column), so a pick that is already
 * attached elsewhere moves here.
 */
const categoryBannersInput = z.object({
  top: z.array(safeText(100)).default([]),
  long: z.array(safeText(100)).default([]),
});

/** Save one top-level category page's banner picks (top pair + carousel). */
export async function setCategoryBanners(
  categoryId: string,
  input: { top: string[]; long: string[] },
): Promise<CategoryActionResult> {
  await requireAdmin();

  let data: z.infer<typeof categoryBannersInput>;
  try {
    data = parseInput(categoryBannersInput, input, "category banners");
  } catch {
    return { ok: false, message: "Check the selected banners." };
  }

  const category = await db.category.findUnique({
    where: { id: categoryId },
    select: { parentId: true },
  });
  if (!category)
    return { ok: false, message: "This category no longer exists." };
  if (category.parentId) {
    // Subcategories have no page of their own, so they host no banners.
    return {
      ok: false,
      message: "Only top-level categories have page banners.",
    };
  }

  // Drop blanks and duplicates; the pair keeps its first two slots. A banner
  // picked in both lists stays up top — the more specific pick wins.
  const cleanIds = (ids: string[]) => [...new Set(ids.filter(Boolean))];
  const top = cleanIds(data.top).slice(0, 2);
  const long = cleanIds(data.long).filter((id) => !top.includes(id));

  // Anything still attached to this page but no longer picked comes off it.
  // Detached, not deleted, so the banner stays available to other pages.
  const attached = await db.banner.findMany({
    where: { categoryId, placement: { in: ["category-top", "category-long"] } },
    select: { id: true },
  });
  const picked = new Set([...top, ...long]);
  const detach = attached.filter((b) => !picked.has(b.id));

  const writes = [
    ...top.map((id, i) =>
      db.banner.update({
        where: { id },
        data: { placement: "category-top", categoryId, sortOrder: i },
      }),
    ),
    ...long.map((id, i) =>
      db.banner.update({
        where: { id },
        data: { placement: "category-long", categoryId, sortOrder: i },
      }),
    ),
    ...detach.map((b) =>
      db.banner.update({
        where: { id: b.id },
        data: { placement: "", categoryId: null },
      }),
    ),
  ];

  try {
    // One transaction so a failed pick cannot leave the page half-saved.
    if (writes.length > 0) await db.$transaction(writes);
  } catch (err) {
    console.error(`[categories] banner picks failed for ${categoryId}:`, err);
    return { ok: false, message: "Could not save the page banners." };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/admin/banners");
  // Every category listing page renders these picks.
  revalidatePath("/category", "layout");
  return { ok: true };
}
