import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ProductForm } from "@/components/admin/product-form";
import { buildBackHref } from "../../lib";

export const dynamic = "force-dynamic";

type Params = { id: string };
type SearchParams = Promise<{
  search?: string;
  brand?: string;
  category?: string;
  active?: string;
  page?: string;
}>;

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: SearchParams;
}) {
  const [{ id }, listParams] = await Promise.all([params, searchParams]);
  const backHref = buildBackHref(listParams);

  const [product, brands, categories] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: { variants: true },
    }),
    db.brand.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!product) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">
        Edit product
      </h1>
      <ProductForm
        product={product}
        brands={brands}
        categories={categories}
        backHref={backHref}
      />
    </div>
  );
}
