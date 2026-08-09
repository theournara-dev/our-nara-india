import type { ProductCard as ProductCardType } from "@/data/products";
import { ProductGridSection } from "./product-grid-section";
import { ThemeProductSection } from "./product-section";

/**
 * Unifies the two product listing layouts behind one section type:
 *   - "grid"     → wraps into rows (static CSS grid)
 *   - "carousel" → scrolls horizontally (Swiper)
 * `columns` controls the grid columns / visible carousel slides. A server
 * component so the grid stays static and Swiper is only loaded for carousels.
 */
export type ProductShowcaseLayout = "grid" | "carousel";

interface ProductShowcaseProps {
  sub?: string;
  title: string;
  products: ProductCardType[];
  layout: ProductShowcaseLayout;
  columns: number;
  moreHref?: string;
  moreLabel?: string;
}

export function ProductShowcase({
  layout,
  columns,
  moreHref,
  moreLabel,
  ...rest
}: ProductShowcaseProps) {
  if (layout === "carousel") {
    // The carousel has no "more" button (matches the original theme).
    return <ThemeProductSection {...rest} columns={columns} />;
  }
  return (
    <ProductGridSection
      {...rest}
      columns={columns}
      moreHref={moreHref}
      moreLabel={moreLabel}
    />
  );
}
