import { BrandsTable } from "@/components/admin/brands-table";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Brand management: the list, its product counts, and deletion. */
export default async function AdminBrandsPage() {
  const brands = await db.brand.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      isActive: true,
      _count: { select: { products: true } },
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900">Brands</h1>
        <p className="text-sm text-zinc-500">
          {brands.length} brand{brands.length === 1 ? "" : "s"}. Brands are
          added from the product form; a brand can be deleted once no product
          uses it, or hidden from the storefront at any time.
        </p>
      </div>
      <BrandsTable
        brands={brands.map((b) => ({
          id: b.id,
          slug: b.slug,
          name: b.name,
          isActive: b.isActive,
          productCount: b._count.products,
        }))}
      />
    </div>
  );
}
