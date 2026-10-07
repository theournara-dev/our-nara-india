"use client";

import Image from "next/image";
import Link from "next/link";
import type { ProductCard as ProductCardType } from "@/data/products";
import { addProductToCart } from "@/lib/cart";
import { formatMoney, priceForVersion } from "@/lib/money";
import { notifyAddedToCart } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useSiteVersion } from "@/components/site-version-provider";

/**
 * Product card. Default image is shown, the hover image crossfades in on hover
 * along with two quick actions (wishlist + add to cart). Images are served
 * unoptimized so any format (jpg, png, gif) is supported.
 *
 * `preview` renders a non-interactive copy (no links or cart buttons) for the
 * admin page-builder preview, with the exact same styling.
 */
export function ThemeProductCard({
  product,
  index,
  priority = false,
  preview = false,
}: {
  product: ProductCardType;
  index?: number;
  /** Eager-load + preload this image (set for the first/above-the-fold card). */
  priority?: boolean;
  /** Static rendering for admin previews — no links, no hover actions. */
  preview?: boolean;
}) {
  const { config } = useSiteVersion();
  const primaryImage = product.images[0];
  const hoverImage = product.hoverImage ?? primaryImage;

  function handleAddToCart() {
    addProductToCart(product);
    notifyAddedToCart(product.name);
  }

  return (
    <>
      <div className="relative text-center">
        {index !== undefined && (
          <span className="absolute left-1 -top-5 z-[10] text-[48px] font-semibold italic leading-none text-point-500 max-[767px]:text-[36px]">
            {index + 1}
          </span>
        )}

        <div className="group relative aspect-square w-full overflow-hidden rounded-2xl">
          {primaryImage ? (
            preview ? (
              <div className="relative block h-full w-full">
                <Image
                  src={primaryImage}
                  alt={product.name}
                  fill
                  unoptimized
                  priority={priority}
                  className="object-cover"
                />
              </div>
            ) : (
              <Link
                href={`/products/${product.slug}`}
                className="relative block h-full w-full"
                aria-label={product.name}
              >
                <Image
                  src={primaryImage}
                  alt={product.name}
                  fill
                  unoptimized
                  priority={priority}
                  className="object-cover transition-opacity duration-300 ease-in-out group-hover:opacity-0"
                />
                <Image
                  src={hoverImage}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100"
                />
              </Link>
            )
          ) : (
            <div className="flex h-full items-center justify-center bg-[#f6f6f6] text-zinc-400">
              {product.brand.name}
            </div>
          )}

          {/* Quick actions (wishlist + cart), revealed on hover */}
          {!preview && (
            <div
              className={cn(
                "absolute bottom-2 -right-50 z-10 flex flex-col gap-1 opacity-0 transition-all duration-300 ease-in-out group-hover:opacity-100 group-hover:right-2",
              )}
            >
              <button
                type="button"
                aria-label="Add to wishlist"
                className="block cursor-pointer"
              >
                <Image
                  src="/upload/icon_202508271427425900.png"
                  alt="wishlist"
                  width={30}
                  height={30}
                  unoptimized
                  className="rounded bg-white/60 p-1"
                />
              </button>
              <button
                type="button"
                aria-label="Add to cart"
                onClick={handleAddToCart}
                className="block cursor-pointer"
              >
                <Image
                  src="/upload/icon_202508271427351600.png"
                  alt="cart"
                  width={30}
                  height={30}
                  unoptimized
                  className="rounded bg-white/60 p-1"
                />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Item text rows — mirrors the original `listitem` rows: brand, name,
          overview (pre-order), product summary, price. */}
      <div className="mt-6 px-2 text-left">
        <span className="my-[2px] block text-sm font-medium leading-[1.4] text-black">
          [{product.brand.name}]
        </span>
        <strong className="mb-2 block text-left text-[15px] font-normal leading-6 text-black line-clamp-2">
          {preview ? (
            product.name
          ) : (
            <Link href={`/products/${product.slug}`} className="text-black">
              {product.name}
            </Link>
          )}
        </strong>
        {product.isPreOrder && config.preOrderEnabled && (
          <span className="mb-2 block text-xs font-medium leading-[1.4] text-[#702dbd]">
            {product.preOrderNotice ?? "PRE-ORDER/Order now, ships later"}
          </span>
        )}
        {product.shortTags.length > 0 && (
          <span className="mb-2 block text-sm font-medium leading-[1.4] text-[#333]">
            {product.shortTags.join(" · ")}
          </span>
        )}
        <span className="block text-lg font-bold leading-[1.4] text-black">
          {formatMoney(
            priceForVersion(product.priceCents, product.globalPriceCents),
            product.currency,
          )}
        </span>
      </div>
    </>
  );
}
