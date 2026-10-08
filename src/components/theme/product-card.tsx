"use client";

import Image from "next/image";
import Link from "next/link";
import type { ProductCard as ProductCardType } from "@/data/products";
import { addProductToCart } from "@/lib/cart";
import { formatMoney, priceForVersion } from "@/lib/money";
import { saleStateForVersion } from "@/lib/product-flags";
import { KDropMark } from "@/components/product/kdrop-mark";
import { notifyAddedToCart } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useSiteVersion } from "@/components/site-version-provider";

/**
 * Product card. Default image is shown, the hover image crossfades in on hover
 * along with two quick actions (wishlist + add to cart). Images are served
 * unoptimized so any format (jpg, png, gif) is supported.
 */
export function ThemeProductCard({
  product,
  index,
  priority = false,
}: {
  product: ProductCardType;
  index?: number;
  /** Eager-load + preload this image (set for the first/above-the-fold card). */
  priority?: boolean;
}) {
  const { version } = useSiteVersion();
  // The card answers per store: what this storefront sells (buy-now /
  // pre-order / not yet) and at what price.
  const saleState = saleStateForVersion(product, version);
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
          ) : (
            <div className="flex h-full items-center justify-center bg-[#f6f6f6] text-zinc-400">
              {product.brand.name}
            </div>
          )}

          {/* Dots showing how many images the product has, as on the original. */}
          {product.images.length > 1 && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-2 z-[5] flex items-center justify-center gap-1"
            >
              {product.images.slice(0, 8).map((src, i) => (
                <span
                  key={src}
                  className={`h-[5px] w-[5px] rounded-full ${
                    i === 0 ? "bg-black" : "bg-black/20"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Quick actions (wishlist + cart), revealed on hover */}
          <div
            className={cn(
              "absolute bottom-2 -right-50 z-10 flex flex-col gap-1 opacity-0 transition-all duration-300 ease-in-out group-hover:opacity-100 group-hover:right-2 max-md:hidden",
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
            {saleState !== "unavailable" && (
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
            )}
          </div>
        </div>
      </div>

      {/* Item text rows — mirrors the original `listitem` rows: brand, name,
          overview (pre-order), product summary, price. */}
      {/* Text sits flush with the image edge, as in the original. Sizes follow
          the original's mobile values and step up on tablet and desktop. The
          brand is deliberately smaller than the name. */}
      <div className="mt-6 text-left">
        <span className="my-[2px] block text-[12px] font-normal leading-[16.8px] text-black md:text-[14px] md:leading-[19.6px]">
          [{product.brand.name}]
        </span>
        {/* International storefront: the K-Drop mark leads the name on the
            same line, matched to the name's own size; the name wraps beside
            it. */}
        <strong className="mb-2 block text-left text-[14px] font-bold leading-6 text-black line-clamp-2 md:text-[15px]">
          <KDropMark className="mr-1 h-[14px] align-middle md:h-[15px]" />
          <Link href={`/products/${product.slug}`} className="text-black">
            {product.name}
          </Link>
        </strong>
        {saleState === "preorder" && (
          <span className="mb-2 block text-xs font-medium leading-[1.4] text-[#702dbd]">
            {product.preOrderNotice ?? "PRE-ORDER/Order now, ships later"}
          </span>
        )}
        {product.shortTags.length > 0 && (
          <span className="mb-2 block text-[13px] font-normal leading-[18.2px] text-[#888] md:text-[14px] md:leading-[19.6px]">
            {product.shortTags.join(" · ")}
          </span>
        )}
        <span className="block text-[14px] font-bold leading-[19.6px] text-black md:text-[18px] md:leading-[25.2px]">
          {formatMoney(
            priceForVersion(product.priceCents, product.globalPriceCents),
            product.currency,
          )}
        </span>
      </div>
    </>
  );
}
