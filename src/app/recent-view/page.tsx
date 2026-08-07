"use client";

import { useMemo } from "react";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { ProductGrid } from "@/components/product/product-grid";
import { productsBySlugs, toCardView } from "@/data/catalog";
import { getRecentViewIds } from "@/lib/recent-view";

/** Recently viewed products in this session, most recent first. */
export default function RecentViewPage() {
  const products = useMemo(() => {
    const slugs = getRecentViewIds();
    return productsBySlugs(slugs).map(toCardView);
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Your Activity"
        title="Recently Viewed"
        subtitle="Products you've looked at in this session, most recent first."
      />
      <Container className="pb-16">
        {products.length === 0 ? (
          <p className="py-20 text-center text-zinc-500">
            You haven&apos;t viewed any products yet.
          </p>
        ) : (
          <ProductGrid products={products} />
        )}
      </Container>
    </div>
  );
}
