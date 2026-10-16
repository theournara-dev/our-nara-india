import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { getProductsByIds } from "@/data/products";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney, priceForVersion } from "@/lib/money";
import { getRequestSiteVersion } from "@/lib/site-version.server";
import { WishlistButton } from "./wishlist-button";

export const dynamic = "force-dynamic";

/**
 * The signed-in customer's saved products (the heart on every product card).
 * Guests never reach this page — the account layout sends them to /login.
 */
export default async function AccountWishlistPage() {
  let userId: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    userId = session?.user?.id ?? null;
  } catch {
    userId = null;
  }

  const rows = userId
    ? await db.wishlistItem.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { productId: true },
      })
    : [];

  const version = await getRequestSiteVersion();
  const products = await getProductsByIds(
    rows.map((r) => r.productId),
    version,
  );

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900">Wishlist</h1>
      <p className="mb-6 text-sm text-zinc-500">
        {products.length} saved item{products.length === 1 ? "" : "s"}. Tap the
        heart on any product to add or remove it.
      </p>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-10 text-center">
          <p className="text-sm text-zinc-500">
            Your wishlist is empty. Tap the heart on any product to save it
            here.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
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
                      product.priceCents,
                      product.globalPriceCents,
                    ),
                    product.currency,
                  )}
                </span>
                <div className="mt-3">
                  <WishlistButton
                    productId={product.id}
                    productName={product.name}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
