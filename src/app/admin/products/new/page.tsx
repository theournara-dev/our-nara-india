import { db } from "@/lib/db";
import { getProductInfoTemplate } from "@/data/products";
import { ProductForm } from "@/components/admin/product-form";
import { buildBackHref } from "../lib";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  search?: string;
  brand?: string;
  category?: string;
  active?: string;
  page?: string;
}>;

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const backHref = buildBackHref(params);

  const [brands, categories, globalInfoRows] = await Promise.all([
    db.brand.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    getProductInfoTemplate(),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">New product</h1>
      <ProductForm
        product={null}
        brands={brands}
        categories={categories}
        backHref={backHref}
        globalInfoRows={globalInfoRows.map((r) => ({
          heading: r.heading,
          body: r.body,
          visible: true,
        }))}
      />
    </div>
  );
}
