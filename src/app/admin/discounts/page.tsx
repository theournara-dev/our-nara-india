import {
  DiscountsManager,
  type AdminDiscountRow,
  type TargetOption,
} from "@/components/admin/discounts-manager";
import { db } from "@/lib/db";
import { discountStatus } from "@/lib/discounts";
import { getSiteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

/** Discount management: the list, the editor, and every target to pick from. */
export default async function AdminDiscountsPage() {
  const [discounts, brands, categories, products, site] = await Promise.all([
    db.discount.findMany({ orderBy: [{ createdAt: "desc" }] }),
    db.brand.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.product.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    // The badge look is shared by both stores, so either row carries it.
    getSiteConfig("local"),
  ]);

  const brandNames = new Map(brands.map((brand) => [brand.id, brand.name]));
  const categoryNames = new Map(
    categories.map((category) => [category.id, category.name]),
  );
  const productNames = new Map(
    products.map((product) => [product.id, product.name]),
  );

  const rows: AdminDiscountRow[] = discounts.map((row) => {
    const targetName =
      row.scope === "BRAND"
        ? (brandNames.get(row.brandId ?? "") ?? null)
        : row.scope === "CATEGORY"
          ? (categoryNames.get(row.categoryId ?? "") ?? null)
          : row.scope === "PRODUCT"
            ? (productNames.get(row.productId ?? "") ?? null)
            : null;

    return {
      id: row.id,
      title: row.title,
      adminNote: row.adminNote,
      type: row.type,
      value: row.value,
      scope: row.scope,
      brandId: row.brandId,
      categoryId: row.categoryId,
      productId: row.productId,
      siteVersion: row.siteVersion as AdminDiscountRow["siteVersion"],
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
      isActive: row.isActive,
      deletedAt: row.deletedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      status: discountStatus(row),
      targetName,
    };
  });

  const brandOptions: TargetOption[] = brands;
  const categoryOptions: TargetOption[] = categories;
  const productOptions: TargetOption[] = products;

  return (
    <DiscountsManager
      discounts={rows}
      brands={brandOptions}
      categories={categoryOptions}
      products={productOptions}
      badgeStyle={site.discountBadge}
    />
  );
}
