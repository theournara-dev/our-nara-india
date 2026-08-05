import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Couponzone" };

const coupons = [
  {
    id: "c1",
    title: "Welcome Gift",
    detail: "+3,000P for new members",
    badge: "New",
  },
  {
    id: "c2",
    title: "Free Shipping",
    detail: "On orders over ₹999",
    badge: "Shipping",
  },
  {
    id: "c3",
    title: "10% Off",
    detail: "On your first order",
    badge: "Percent",
  },
];

export default function CouponzonePage() {
  return (
    <div>
      <PageHeader
        eyebrow="Promotions"
        title="Couponzone"
        subtitle="Download coupons and use them at checkout."
      />
      <Container className="pb-16">
        <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-3">
          {coupons.map((coupon) => (
            <div
              key={coupon.id}
              className="flex flex-col rounded-2xl border border-zinc-100 bg-white p-6"
            >
              <Badge tone="accent" className="self-start">
                {coupon.badge}
              </Badge>
              <h2 className="mt-3 text-lg font-semibold text-zinc-900">
                {coupon.title}
              </h2>
              <p className="mt-1 flex-1 text-sm text-zinc-500">
                {coupon.detail}
              </p>
              <Button size="sm" variant="outline" className="mt-4 self-start">
                Apply
              </Button>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
