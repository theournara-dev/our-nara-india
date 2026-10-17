import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { CategoryProductList } from "@/components/product/category-product-list";
import { getFeaturedProducts } from "@/data/products";
import { getRequestSiteVersion } from "@/lib/site-version.server";

export const metadata: Metadata = { title: "HOT" };

// The listing reads the live catalogue, like the category pages.
export const dynamic = "force-dynamic";

/**
 * /hot — the bar's HOT link (client's slide: the bar keeps HOT among its links).
 *
 * The reference names the link but not a destination, and no "hot" collection
 * exists in the catalogue, so this lists the newest products across every brand
 * with the same listing the category and brand pages use. It is the one place
 * that needs the client's real target (e.g. a curated sale collection).
 */
export default async function HotPage() {
  const version = await getRequestSiteVersion();
  const products = await getFeaturedProducts(60, version);

  return (
    <div>
      <PageHeader title="HOT" />
      <Container wide className="pb-16">
        <CategoryProductList products={products} columns={5} />
      </Container>
    </div>
  );
}
