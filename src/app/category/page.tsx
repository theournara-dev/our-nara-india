import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { getRootCategories } from "@/data/categories";

export const metadata: Metadata = { title: "Category" };

// The index follows the admin's category tree, like the header menu.
export const dynamic = "force-dynamic";

/**
 * /category — the index behind the header's CATEGORY link (and the phone tab
 * bar's). One tile per top-level category, in the admin's order, each opening
 * that category's listing. The tiles use the category's own artwork, exactly as
 * the mid-level tiles on a listing do.
 */
export default async function CategoryIndexPage() {
  const categories = await getRootCategories();

  return (
    <div>
      <PageHeader title="Category" />
      <Container className="pb-16">
        {categories.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-400">
            No categories yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/category/${category.slug}`}
                className="group block"
              >
                <span className="relative block aspect-square overflow-hidden rounded-2xl bg-[#f6f6f6]">
                  {category.image && (
                    <Image
                      src={category.image}
                      alt=""
                      fill
                      unoptimized
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
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
