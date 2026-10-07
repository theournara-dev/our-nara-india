import {
  CouponsManager,
  type AdminCouponRow,
  type CouponTarget,
} from "@/components/admin/coupons-manager";
import { couponRowToRecord } from "@/lib/coupon-store";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Coupon management: the list, the editor, and the usage counts. */
export default async function AdminCouponsPage() {
  const [coupons, brands, categories, products, redemptionCounts] =
    await Promise.all([
      db.coupon.findMany({ orderBy: [{ createdAt: "desc" }] }),
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
      db.couponRedemption.groupBy({
        by: ["couponId"],
        _count: { _all: true },
      }),
    ]);

  const countByCoupon = new Map(
    redemptionCounts.map((row) => [row.couponId, row._count._all]),
  );

  const rows: AdminCouponRow[] = coupons.map((coupon) => ({
    ...couponRowToRecord(coupon),
    redemptionCount: countByCoupon.get(coupon.id) ?? 0,
  }));

  const brandOptions: CouponTarget[] = brands;
  const categoryOptions: CouponTarget[] = categories;
  const productOptions: CouponTarget[] = products;

  return (
    <CouponsManager
      coupons={rows}
      brands={brandOptions}
      categories={categoryOptions}
      products={productOptions}
    />
  );
}
