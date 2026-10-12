"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseInput, safeText } from "@/lib/validation";

/**
 * Brand management actions. Products reference a brand with no cascade, so a
 * brand can only be deleted once nothing points at it — otherwise the store
 * would lose the brand its products are filed under.
 */

export type BrandActionResult = { ok: true } | { ok: false; message: string };

export async function deleteBrand(id: string): Promise<BrandActionResult> {
  await requireAdmin();
  const brand = await db.brand.findUnique({
    where: { id },
    select: { name: true, _count: { select: { products: true } } },
  });
  if (!brand) return { ok: false, message: "This brand no longer exists." };

  const products = brand._count.products;
  if (products > 0) {
    return {
      ok: false,
      message: `${brand.name} still has ${products} product${products === 1 ? "" : "s"}. Move them to another brand first.`,
    };
  }

  try {
    await db.brand.delete({ where: { id } });
  } catch (err) {
    console.error(`[brands] delete failed for ${id}:`, err);
    return { ok: false, message: "Could not delete this brand." };
  }

  revalidatePath("/admin/brands");
  revalidatePath("/admin/products");
  revalidatePath("/brands");
  return { ok: true };
}

/** Hide a brand from the storefront without deleting it. */
export async function toggleBrandActive(
  id: string,
  isActive: boolean,
): Promise<BrandActionResult> {
  await requireAdmin();
  try {
    await db.brand.update({ where: { id }, data: { isActive } });
  } catch (err) {
    console.error(`[brands] toggle failed for ${id}:`, err);
    return { ok: false, message: "Could not update this brand." };
  }
  revalidatePath("/admin/brands");
  revalidatePath("/brands");
  return { ok: true };
}

const brandUpdateInput = z.object({
  /** null clears the group (the brand stays in "All" only). */
  group: z.enum(["ONLY_AT_OURNARA", "NEW_LAUNCH"]).nullable().optional(),
  logoUrl: safeText(2000).optional(),
});

/**
 * Save the /brands page fields: the curated group tab and the brand image
 * (client slide 8; both are set from the brands table's edit dialog).
 */
export async function updateBrand(
  id: string,
  input: z.infer<typeof brandUpdateInput>,
): Promise<BrandActionResult> {
  await requireAdmin();
  const data = parseInput(brandUpdateInput, input, "brands.update");
  try {
    await db.brand.update({
      where: { id },
      data: {
        ...(data.group !== undefined ? { group: data.group } : {}),
        ...(data.logoUrl !== undefined
          ? { logoUrl: data.logoUrl.trim() || null }
          : {}),
      },
    });
  } catch (err) {
    console.error(`[brands] update failed for ${id}:`, err);
    return { ok: false, message: "Could not update this brand." };
  }
  revalidatePath("/admin/brands");
  revalidatePath("/brands");
  return { ok: true };
}
