import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getProductInfoTemplate } from "@/data/products";
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

  const [product, brands, categories, globalInfoRows, reviewRows] =
    await Promise.all([
      db.product.findUnique({
        where: { id },
        include: {
          variants: { orderBy: { sortOrder: "asc" } },
          blocks: { orderBy: { sortOrder: "asc" } },
        },
      }),
      db.brand.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      db.category.findMany({
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true },
      }),
      getProductInfoTemplate(),
      db.review.findMany({
        where: { productId: id },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, email: true } } },
      }),
    ]);

  if (!product) notFound();

  const reviews = reviewRows.map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    authorName: r.user?.name?.trim() || r.user?.email || "Customer",
    createdAt: r.createdAt.toISOString(),
    isVisible: r.isVisible,
  }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-zinc-900">Edit product</h1>
        <Link
          href={`/admin/products/${product.id}/qa`}
          className="inline-flex h-9 items-center rounded border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Manage Q&amp;A →
        </Link>
      </div>
      <ProductForm
        product={product}
        brands={brands}
        categories={categories}
        backHref={backHref}
        globalInfoRows={globalInfoRows.map((r) => ({
          heading: r.heading,
          body: r.body,
          visible: true,
        }))}
        reviews={reviews}
      />
    </div>
  );
}
