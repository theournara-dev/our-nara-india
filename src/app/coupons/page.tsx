import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { CouponCard } from "@/components/coupons/coupon-card";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { loadStorefrontCoupons } from "@/lib/coupon-store";
import {
  SITE_VERSION_COOKIE,
  parseSiteVersion,
  resolveRequestSiteVersion,
} from "@/lib/site-version";

export const metadata: Metadata = { title: "Couponzone" };

/**
 * The couponzone: every coupon a shopper on this store can use right now.
 * Coupons scoped to a brand, category or product are listed here too — the
 * cart and product pages surface the ones that fit what is being bought.
 */
export default async function CouponzonePage() {
  const requestHeaders = await headers();
  const cookieStore = await cookies();
  const version =
    parseSiteVersion(cookieStore.get(SITE_VERSION_COOKIE)?.value) ??
    resolveRequestSiteVersion(
      requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
    );
  const coupons = await loadStorefrontCoupons(version);

  return (
    <div>
      <PageHeader
        eyebrow="Promotions"
        title="Couponzone"
        subtitle="Download coupons and use them at checkout."
      />
      <Container className="pb-16">
        {coupons.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-zinc-200 bg-white p-12 text-center">
            <p className="text-3xl">🎟️</p>
            <p className="mt-3 text-zinc-600">
              There are no coupons available right now. Check back soon!
            </p>
          </div>
        ) : (
          <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coupons.map((coupon) => (
              <CouponCard key={coupon.id} coupon={coupon} />
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}
