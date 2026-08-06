import Link from "next/link";
import type { ProductCard as ProductCardType } from "@/data/products";
import { formatMoney } from "@/lib/money";

/**
 * Product card (Tailwind-native). Rendered inside the product carousel's
 * <li class="swiper-slide">.
 */
export function ThemeProductCard({ product }: { product: ProductCardType }) {
  return (
    <>
      <div className="relative text-center">
        <div className="overflow-hidden rounded-lg">
          <Link href={`/products/${product.slug}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.images[0]}
              alt={product.name}
              className="aspect-square w-full object-cover"
            />
          </Link>
        </div>
      </div>
      <div className="mt-6 px-2 text-left text-xs leading-relaxed">
        <strong className="mb-2 block text-left font-normal leading-8 line-clamp-2">
          <Link href={`/products/${product.slug}`} className="text-zinc-800">
            {product.name}
          </Link>
        </strong>
        <ul className="space-y-0.5">
          <li className="text-zinc-500">{product.brand.name}</li>
          <li className="text-zinc-400">{product.shortTags.join(" · ")}</li>
          <li className="font-semibold text-zinc-900">
            {formatMoney(product.priceCents, product.currency)}
          </li>
        </ul>
      </div>
    </>
  );
}
