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

  // Options for the section forms (brand/category/product pickers).
  const [brands, categories, products] = await Promise.all([
    db.brand.findMany({
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.category.findMany({
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.product.findMany({
      select: { slug: true, name: true },
      where: { isActive: true },
      orderBy: { name: "asc" },
      take: 500,
    }),
  ]);

  return (
    <PageBuilder
      page={page}
      options={{ brands, categories, products }}
    />
  );
}
