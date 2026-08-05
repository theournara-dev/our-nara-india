import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { getBrands } from "@/data/brands";

export const metadata: Metadata = { title: "Shop by Brand" };

export default async function BrandsPage() {
  const brands = await getBrands();
  return (
    <div>
      <PageHeader
        eyebrow="Our Labels"
        title="Shop by Brand"
        subtitle="Explore the Korean beauty brands we carry."
      />
      <Container className="pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
            <div
              key={brand.slug}
              className="flex flex-col rounded-2xl border border-zinc-100 bg-white p-6"
            >
              <p className="text-xl font-semibold text-zinc-900">
                {brand.name}
              </p>
              {brand.description && (
                <p className="mt-2 flex-1 text-sm text-zinc-500">
                  {brand.description}
                </p>
              )}
              <Button
                href={`/brand/${brand.slug}`}
                variant="outline"
                size="sm"
                className="mt-4 self-start"
              >
                View products
              </Button>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
