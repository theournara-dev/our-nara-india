"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toggleWishlist } from "@/app/actions/wishlist";
import { useWishlist } from "@/components/wishlist-provider";
import type { ProductCard as ProductCardType } from "@/data/products";
import { formatMoney, priceForVersion } from "@/lib/money";
import { notify } from "@/lib/toast";

/**
 * Saved products. Removing is optimistic: the card disappears immediately and
 * comes back (with a notification) if the server rejects it, so a shopper can
 * clear several fast without waiting for each round trip.
 */
export function WishlistItems({ products }: { products: ProductCardType[] }) {
  const router = useRouter();
  const { setSaved } = useWishlist();
  const [items, setItems] = useState(products);

  async function remove(product: ProductCardType) {
    setItems((prev) => prev.filter((p) => p.id !== product.id));
    const res = await toggleWishlist(product.id);
    if (!res.ok || res.saved) {
      // Restore in the original order, keeping anything removed meanwhile out.
      setItems((prev) =>
        products.filter(
          (p) => p.id === product.id || prev.some((x) => x.id === p.id),
        ),
      );
      notify.error(
        "Wishlist",
        res.ok ? "Could not remove that item." : res.message,
      );
      if (!res.ok && res.reason === "auth") router.push("/login");
      return;
    }
    setSaved(product.id, false);
    notify.success("Removed from wishlist", product.name);
  }

  return (
    <>
      <p className="mb-6 text-sm text-zinc-500">
        {items.length} saved item{items.length === 1 ? "" : "s"}. Tap the heart
        on any product to add or remove it.
      </p>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-10 text-center">
          <p className="text-sm text-zinc-500">
            Your wishlist is empty. Tap the heart on any product to save it
            here.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((product) => (
            <li
              key={product.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-zinc-100 bg-white"
            >
              <Link
                href={`/products/${product.slug}`}
                className="relative block aspect-square bg-[#f6f6f6]"
                aria-label={product.name}
              >
                {product.images[0] && (
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover"
                  />
                )}
              </Link>
              <div className="flex flex-1 flex-col p-3">
                <span className="text-[11px] text-zinc-500">
                  [{product.brand.name}]
                </span>
                <Link
                  href={`/products/${product.slug}`}
                  className="mt-0.5 line-clamp-2 font-category text-sm font-bold text-black hover:text-point-500"
                >
                  {product.name}
                </Link>
                <span className="mt-2 text-sm font-bold text-black">
                  {formatMoney(
                    priceForVersion(
                      product.effectivePriceCents,
                      product.effectiveGlobalPriceCents,
                    ),
                    product.currency,
                  )}
                </span>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => remove(product)}
                    className="inline-flex h-9 cursor-pointer items-center justify-center rounded-full border border-zinc-200 px-4 text-xs font-medium text-zinc-600 transition-colors hover:border-point-500 hover:text-point-500"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
