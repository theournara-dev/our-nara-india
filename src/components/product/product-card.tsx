"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { ProductCard } from "@/data/products";
import { addProductToCart } from "@/lib/cart";
import { formatMoney } from "@/lib/money";
import { notifyAddedToCart } from "@/lib/toast";

/**
 * A single product card used across the storefront (homepage sections,
 * category and brand listings). Links to the product detail page and offers a
 * quick add-to-cart action revealed on hover.
 */
export function ProductCard({ product }: { product: ProductCard }) {
  const imageUrl = product.images[0];
  const hasDiscount =
    product.compareAtCents != null &&
    product.compareAtCents > product.priceCents;

  function handleAddToCart() {
    addProductToCart(product);
    notifyAddedToCart(product.name);
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-100 bg-white transition-shadow hover:shadow-lg">
      <Link
        href={`/products/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-zinc-100"
      >
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
            <span className="px-4 text-center text-sm">
              {product.brand.name}
            </span>
          </div>
        )}
        {product.isPreOrder && (
          <Badge tone="accent" className="absolute left-3 top-3">
            PRE-ORDER
          </Badge>
        )}
      </Link>

      {/* Quick add-to-cart, revealed on hover */}
      <button
        type="button"
        aria-label={`Add ${product.name} to cart`}
        onClick={handleAddToCart}
        className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-lg text-zinc-700 opacity-0 shadow-sm backdrop-blur transition-opacity duration-300 hover:bg-point-500 hover:text-white group-hover:opacity-100"
      >
        +
      </button>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          {product.brand.name}
        </span>
        <h3 className="line-clamp-2 font-medium text-zinc-900">
          <Link
            href={`/products/${product.slug}`}
            className="hover:text-point-500"
          >
            {product.name}
          </Link>
        </h3>
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
    </div>
  );
}
