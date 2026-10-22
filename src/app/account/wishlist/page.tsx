import { headers } from "next/headers";
import { getProductsByIds } from "@/data/products";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRequestSiteVersion } from "@/lib/site-version.server";
import { WishlistItems } from "./wishlist-items";

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
      <WishlistItems products={products} />
    </div>
  );
}
