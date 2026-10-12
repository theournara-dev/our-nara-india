import Link from "next/link";
import { ProductsTabs } from "@/components/admin/products-tabs";
import { SubcategoryImport } from "@/components/admin/subcategory-import";

export const dynamic = "force-dynamic";

export const metadata = { title: "Import subcategories" };

/**
 * Bulk subcategory mapping: paste the client's CSV (product slug, category,
 * subcategory), preview what it resolves to, then import. This is the tool for
 * mapping the hundreds of incoming products without opening each product page.
 */
export default function ImportSubcategoriesPage() {
  return (
    <div>
      <ProductsTabs active="products" />
      <div className="mb-6">
        <Link
          href="/admin/products"
          className="text-xs text-zinc-400 hover:text-point-500"
        >
          ← Products
        </Link>
        <h1 className="mb-1 mt-2 text-2xl font-semibold text-zinc-900">
          Import subcategories
        </h1>
        <p className="text-sm text-zinc-500">
          Assign mid-level categories to many products at once. Same result as
          ticking products in the list and using the bulk bar, but for a whole
          sheet.
        </p>
      </div>
      <SubcategoryImport />
    </div>
  );
}
