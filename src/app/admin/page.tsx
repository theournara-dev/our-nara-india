import type { Metadata } from "next";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Admin · Overview" };

export default async function AdminOverviewPage() {
  const [users, products, orders, pendingReviews, activeCoupons, revenue] =
    await Promise.all([
      db.user.count(),
      db.product.count(),
      db.order.count(),
      db.review.count({ where: { status: "PENDING" } }),
      db.coupon.count({ where: { isActive: true } }),
      db.order.aggregate({
        _sum: { totalCents: true },
        where: { status: "PAID" },
      }),
    ]);

  const stats = [
    { label: "Users", value: users.toLocaleString() },
    { label: "Products", value: products.toLocaleString() },
    { label: "Orders", value: orders.toLocaleString() },
    {
      label: "Revenue (paid)",
      value: `₹${((revenue._sum.totalCents ?? 0) / 100).toLocaleString("en-IN")}`,
    },
    { label: "Pending reviews", value: pendingReviews.toLocaleString() },
    { label: "Active coupons", value: activeCoupons.toLocaleString() },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-zinc-100 bg-white p-5"
          >
            <p className="text-sm text-zinc-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
