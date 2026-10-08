import Link from "next/link";
import { ThemeProductCard } from "@/components/theme/product-card";
import type { ProductCard as ProductCardType } from "@/data/products";

interface ProductGridSectionProps {
  sub?: string;
  title: string;
  products: ProductCardType[];
  /** Columns on large screens (responsive: 2 → 3 → N). Default 5. */
  columns?: number;
  /** Optional "more products" link rendered as a pill button below the grid. */
  moreHref?: string;
  moreLabel?: string;
}

/** Literal Tailwind classes so the JIT can see every possible grid size. */
const GRID_CLASS: Record<number, string> = {
  1: "grid-cols-1 lg:grid-cols-1",
  2: "grid-cols-2 lg:grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
};

/**
 * A static responsive product grid with a centered heading (optional sub +
 * title) and an optional "more products" button. Reproduces the original
 * theme's `listmain` grid sections (e.g. PRE-ORDER).
 */
export function ProductGridSection({
  sub,
  title,
  products,
  columns = 5,
  moreHref,
  moreLabel = "MORE PRODUCTS →",
}: ProductGridSectionProps) {
  if (products.length === 0) return null;
  const gridClass = GRID_CLASS[columns] ?? GRID_CLASS[5];

  return (
    <div className="mb-[10px] mt-[100px] w-full max-[767px]:mb-5 max-[767px]:mt-[60px]">
      <div className="relative mx-auto box-border w-[92%] max-w-[1560px] px-2 max-[767px]:w-[96%]">
        <div className="mx-auto mb-2">
          <h2 className="text-center text-2xl font-bold leading-8 tracking-tight text-ink">
            {sub && (
              <span className="block text-base font-medium leading-6 text-point-500">
                {sub}
              </span>
            )}
            {title}
          </h2>
        </div>

        <div className={`grid gap-x-4 gap-y-8 pt-4 ${gridClass}`}>
          {products.map((product, index) => (
            <div key={product.id}>
              <ThemeProductCard product={product} priority={index === 0} />
            </div>
          ))}
        </div>

        {moreHref && (
          <div className="mt-8 text-center">
            <Link
              href={moreHref}
              className="inline-flex h-10 w-[186px] items-center justify-center rounded-full border border-[#6f2dbd] bg-white text-[13px] font-medium text-[#6f2bdb] transition-colors duration-300 hover:bg-[#6f2dbd] hover:text-white"
            >
              {moreLabel}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
