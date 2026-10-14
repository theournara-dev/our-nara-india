import "server-only";
import { db } from "@/lib/db";
import type { LinkFieldOptions } from "@/components/admin/link-field";

/**
 * The brand/category/product lists the shared link picker offers, for the
 * standalone admin forms (events) that don't go through the page builder's
 * `SectionFormOptions`.
 */
export async function loadLinkFieldOptions(): Promise<LinkFieldOptions> {
  const [brands, categories, products] = await Promise.all([
    db.brand.findMany({
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.category.findMany({
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.product.findMany({
      select: { slug: true, name: true },
      where: { isActive: true },
      orderBy: { name: "asc" },
      take: 500,
    }),
  ]);
  return { brands, categories, products };
}
