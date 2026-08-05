import { ProductCard } from "@/components/product/product-card";
import type { ProductCard as ProductCardType } from "@/data/products";

interface ProductGridProps {
  products: ProductCardType[];
  className?: string;
}

/** Responsive grid of product cards. */
export function ProductGrid({ products, className }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <p className="py-16 text-center text-zinc-500">
        No products available right now.
      </p>
    );
  }

  return (
    <div
      className={`grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 ${className ?? ""}`}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
