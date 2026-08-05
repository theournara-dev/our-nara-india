import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { ProductCard } from "@/data/products";
import { formatMoney } from "@/lib/money";

/**
 * A single product card used across the storefront (homepage sections,
 * category and brand listings). Links to the product detail page.
 */
export function ProductCard({ product }: { product: ProductCard }) {
  const imageUrl = product.images[0];
  const hasDiscount =
    product.compareAtCents != null && product.compareAtCents > product.priceCents;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-100 bg-white transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-zinc-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 text-zinc-400">
            <span className="px-4 text-center text-sm">{product.brand.name}</span>
          </div>
        )}
        {product.isPreOrder && (
          <Badge tone="accent" className="absolute left-3 top-3">
            PRE-ORDER
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          {product.brand.name}
        </span>
        <h3 className="line-clamp-2 font-medium text-zinc-900">{product.name}</h3>
        {product.shortTags.length > 0 && (
          <p className="line-clamp-1 text-sm text-zinc-500">
            {product.shortTags.join(" · ")}
          </p>
        )}
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="font-semibold text-zinc-900">
            {formatMoney(product.priceCents, product.currency)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-zinc-400 line-through">
              {formatMoney(product.compareAtCents!, product.currency)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
