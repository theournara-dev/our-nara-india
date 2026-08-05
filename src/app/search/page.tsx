import { Container } from "@/components/ui/container";
import { ProductGrid } from "@/components/product/product-grid";
import { products, getBrand } from "@/data/catalog";

function matchesQuery(text: string, query: string) {
  return text.toLowerCase().includes(query.toLowerCase());
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const results = query
    ? products.filter((p) => {
        const brand = getBrand(p.brandSlug)?.name ?? "";
        return (
          matchesQuery(p.name, query) ||
          matchesQuery(brand, query) ||
          matchesQuery(p.summary ?? "", query) ||
          p.shortTags.some((t) => matchesQuery(t, query))
        );
      })
    : [];

  return (
    <Container className="py-10">
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-400">
        {query ? `${results.length} result${results.length === 1 ? "" : "s"}` : "Search"}
      </p>
      <h1 className="font-display mb-6 text-3xl font-semibold text-zinc-900">
        {query ? `Results for “${query}”` : "Search products"}
      </h1>

      {!query ? (
        <p className="text-zinc-500">Use the search box in the header to find products and brands.</p>
      ) : results.length === 0 ? (
        <p className="text-zinc-500">No products matched “{query}”. Try a different term.</p>
      ) : (
        <ProductGrid products={results.map((p) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          summary: p.summary,
          shortTags: p.shortTags,
          priceCents: p.priceCents,
          compareAtCents: p.compareAtCents,
          currency: p.currency,
          isPreOrder: p.isPreOrder,
          preOrderNotice: p.preOrderNotice,
          images: p.images,
          brand: { slug: p.brandSlug, name: getBrand(p.brandSlug)?.name ?? p.brandSlug },
        }))} />
      )}
    </Container>
  );
}
