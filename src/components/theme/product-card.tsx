import Image from "next/image";
import Link from "next/link";
import type { ProductCard as ProductCardType } from "@/data/products";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Product card. Default image is shown, the hover image crossfades in on hover
 * along with two quick actions (wishlist + add to cart). Images are served
 * unoptimized so any format (jpg, png, gif) is supported.
 */
export function ThemeProductCard({
  product,
  index,
}: {
  product: ProductCardType;
  index?: number;
}) {
  const primaryImage = product.images[0];
  const hoverImage = product.hoverImage ?? primaryImage;

  return (
    <>
      <div className="relative text-center">
        {index !== undefined && (
          <span className="absolute left-1 -top-5 z-[10] text-[48px] font-semibold italic leading-none text-point-500 max-[767px]:text-[36px]">
            {index + 1}
          </span>
        )}

        <div className="group relative aspect-square w-full overflow-hidden rounded-2xl">
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

          {/* Quick actions (wishlist + cart), revealed on hover */}
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
        </div>
      </div>

      <div className="mt-6 px-2 text-left space-y-1 leading-relaxed">
        <span className="text-sm text-black">[{product.brand.name}]</span>
        <strong className="block text-left text-[15px] font-normal leading-8 line-clamp-2">
          <Link href={`/products/${product.slug}`} className="text-black">
            {product.name}
          </Link>
        </strong>
        {product.isPreOrder && (
          <span className="block text-[13px] font-medium text-[#702dbd]">
            PRE-ORDER/Order now, ships later
          </span>
        )}
        <ul className="space-y-0.5">
          <li className="text-sm text-[#888888]">
            {product.shortTags.join(" · ")}
          </li>
          <li className="text-[18px] font-bold text-black">
            {formatMoney(product.priceCents, product.currency)}
          </li>
        </ul>
      </div>
    </>
  );
}
