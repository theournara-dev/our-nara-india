import { Container } from "@/components/ui/container";
import { ProductGrid } from "@/components/product/product-grid";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const results = query
    ? await db.product.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { summary: { contains: query, mode: "insensitive" } },
            { brand: { name: { contains: query, mode: "insensitive" } } },
          ],
        },
        include: { brand: { select: { slug: true, name: true } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <Container className="py-10">
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-400">
        {query
          ? `${results.length} result${results.length === 1 ? "" : "s"}`
          : "Search"}
      </p>
      <h1 className="font-display mb-6 text-3xl font-semibold text-zinc-900">
        {query ? `Results for “${query}”` : "Search products"}
      </h1>

      {!query ? (
        <p className="text-zinc-500">
          Use the search box in the header to find products and brands.
        </p>
      ) : results.length === 0 ? (
        <p className="text-zinc-500">
          No products matched “{query}”. Try a different term.
        </p>
      ) : (
        <ProductGrid
          products={results.map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            summary: p.summary ?? undefined,
            shortTags: p.shortTags,
            priceCents: p.priceCents,
            compareAtCents: p.compareAtCents ?? undefined,
            currency: p.currency,
            isPreOrder: p.isPreOrder,
            preOrderNotice: p.preOrderNotice ?? undefined,
            images: p.images,
            hoverImage: p.images[1] ?? p.images[0],
            brand: { slug: p.brand.slug, name: p.brand.name },
          }))}
        />
      )}
    </Container>
  );
}
