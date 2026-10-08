import { ThemeProductCard } from "@/components/theme/product-card";
import type { ProductCard as ProductCardType } from "@/data/products";

interface ProductGridProps {
  products: ProductCardType[];
  className?: string;
  /** Columns on large screens (default 4). */
  columns?: 3 | 4 | 5;
}

/**
 * Responsive grid of product cards. Uses the same item rendering as the home
 * page sections so listings match the original storefront.
 */
export function ProductGrid({
  products,
  className,
  columns = 4,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <p className="py-16 text-center text-zinc-500">
        No products available right now.
      </p>
    );
  }

  const cols =
    columns === 5
      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      : columns === 3
        ? "grid-cols-2 sm:grid-cols-3"
        : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";

  return (
    <div className={`grid gap-x-4 gap-y-8 ${cols} ${className ?? ""}`}>
      {products.map((product, index) => (
        // The card renders two blocks (image, then text). Wrapping each card in
        // its own cell keeps them together — without this the image and text
        // would land in separate grid cells.
        <div key={product.id}>
          <ThemeProductCard product={product} priority={index === 0} />
        </div>
      ))}
    </div>
  );
}
