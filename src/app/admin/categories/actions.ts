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
  | { ok: true }
  | { ok: false; message: string };

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
export async function deleteCategory(id: string): Promise<CategoryActionResult> {
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
  if (!category) return { ok: false, message: "This category no longer exists." };

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
  if (!category) return { ok: false, message: "This category no longer exists." };

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
