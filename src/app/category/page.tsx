import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { getRootCategories } from "@/data/categories";
import { getProductsByCategorySlug } from "@/data/products";
import { getRequestSiteVersion } from "@/lib/site-version.server";

export const metadata: Metadata = { title: "Category" };

// The index follows the admin's category tree, like the header menu.
export const dynamic = "force-dynamic";

/**
 * /category — the index behind the header's CATEGORY link (and the phone tab
 * bar's). One tile per top-level category, in the admin's order, each opening
 * that category's listing.
 *
 * The tiles use the category's own artwork when an admin uploaded one; until
 * then they fall back to the first product image in the category, so the page
 * is never a grid of empty boxes (the client's note). A category with neither
 * still gets a branded block rather than a blank one.
 */
export default async function CategoryIndexPage() {
  const version = await getRequestSiteVersion();
  const categories = await getRootCategories();

  const covers = await Promise.all(
    categories.map(async (category) => {
      if (category.image) return category.image;
      const [first] = await getProductsByCategorySlug(
        category.slug,
        1,
        version,
      );
      return first?.images[0] ?? null;
    }),
  );
  const tiles = categories.map((category, index) => ({
    ...category,
    cover: covers[index],
  }));

  return (
    <div>
      <PageHeader title="Category" />
      <Container className="pb-16">
        {tiles.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-400">
            No categories yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {tiles.map((category) => (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className="group block"
              >
                <span className="relative block aspect-square overflow-hidden rounded-2xl bg-[#f6f6f6]">
                  {category.cover ? (
                    <Image
                      src={category.cover}
                      alt=""
                      fill
                      unoptimized
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        background: "linear-gradient(135deg, #6f2dbd, #b79be8)",
                      }}
                    />
                  )}
                </span>
                <span className="mt-3 block text-center font-category text-lg font-semibold text-ink">
                  {category.name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}
