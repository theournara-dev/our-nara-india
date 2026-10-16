import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getPage } from "@/lib/page-builder/data";
import { PageBuilder } from "@/components/admin/page-builder/builder";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export default async function PageBuilderPage({ params }: { params: Params }) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();

  // Options for the section forms (brand/category/product/banner pickers).
  const [brands, categories, products, banners] = await Promise.all([
    db.brand.findMany({
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.category.findMany({
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.product.findMany({
      select: {
        slug: true,
        name: true,
        images: true,
        summary: true,
        isPreOrder: true,
        brand: { select: { slug: true, name: true } },
      },
      where: { isActive: true },
      orderBy: { name: "asc" },
      take: 500,
    }),
    db.banner.findMany({
      select: {
        id: true,
        title: true,
        image: true,
        mobileImage: true,
        alt: true,
        href: true,
        placement: true,
        isActive: true,
        startsAt: true,
        expiresAt: true,
        // The content a banner draws, so the section editors can preview it
        // exactly as the storefront will (client's slide 3).
        style: true,
        heading: true,
        subheading: true,
        textAlign: true,
        textVAlign: true,
        textColor: true,
        scrim: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const productOptions = products.map((p) => ({
    slug: p.slug,
    name: p.name,
    image: p.images[0] ?? "",
    brandSlug: p.brand.slug,
    brandName: p.brand.name,
    isPreOrder: p.isPreOrder,
    summary: p.summary ?? undefined,
  }));

  // The section editors preview banners, so they need to know which ones the
  // storefront would actually render right now (active and in schedule) — the
  // loaders draw their "Automatic" pool from exactly those.
  const now = new Date();
  const bannerOptions = banners.map(({ startsAt, expiresAt, ...b }) => ({
    ...b,
    live:
      b.isActive &&
      (!startsAt || startsAt <= now) &&
      (!expiresAt || expiresAt >= now),
  }));

  return (
    <PageBuilder
      page={page}
      options={{
        brands,
        categories,
        products: productOptions,
        banners: bannerOptions,
      }}
    />
  );
}
