import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ProductQAEditor } from "@/components/admin/product-qa-editor";

export const dynamic = "force-dynamic";

export default async function ProductQAPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const product = await db.product.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!product) notFound();

  const rows = await db.productQA.findMany({
    where: { productId: id, status: { not: "DISCARDED" } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-zinc-900">
            Q&amp;A · {product.name}
          </h1>
          <p className="text-sm text-zinc-500">
            Curate the questions shown on the product page. User submissions
            stay hidden until you add them.
          </p>
        </div>
        <Link
          href={`/admin/products/${id}/edit`}
          className="inline-flex h-9 items-center rounded border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          ← Back to product
        </Link>
      </div>

      <ProductQAEditor
        productId={id}
        rows={rows.map((r) => ({
          id: r.id,
          question: r.question,
          answer: r.answer,
          isVisible: r.isVisible,
          source: r.source,
          status: r.status,
        }))}
      />
    </div>
  );
}
