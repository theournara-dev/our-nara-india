import { cache } from "react";
import { db } from "@/lib/db";
import type { DiscountRecord } from "@/lib/discounts";

/**
 * Every live discount, regardless of store. The resolver narrows by
 * `siteVersion` and target, so a page loads this once and shares it.
 */
export const getLiveDiscounts = cache(async (): Promise<DiscountRecord[]> => {
  const rows = await db.discount.findMany({
    where: { deletedAt: null, isActive: true },
    select: {
      id: true,
      title: true,
      type: true,
      value: true,
      scope: true,
      brandId: true,
      categoryId: true,
      productId: true,
      siteVersion: true,
      startsAt: true,
      endsAt: true,
      isActive: true,
      deletedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  // Prisma types `siteVersion` as string; the resolver narrows it.
  return rows as DiscountRecord[];
});
