"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Wishlist toggle for the product cards' heart button and the wishlist page.
 *
 * The wishlist belongs to an account, so an anonymous visitor is told to sign
 * in instead of getting a silent no-op — the client's slide 1 asks for every
 * button to actually do something. Failures are RETURNED, never thrown: Next.js
 * masks thrown server-action errors in production builds.
 */

export type WishlistResult =
  | { ok: true; saved: boolean }
  | { ok: false; reason: "auth" | "error"; message: string };

/** The signed-in user's id, or null when the visitor is anonymous. */
async function currentUserId(): Promise<string | null> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user?.id ?? null;
  } catch {
    // A corrupt cookie must not 500 the action — treat it as anonymous.
    return null;
  }
}

export async function toggleWishlist(productId: string): Promise<WishlistResult> {
  const userId = await currentUserId();
  if (!userId) {
    return {
      ok: false,
      reason: "auth",
      message: "Sign in to save items to your wishlist.",
    };
  }

  try {
    const existing = await db.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
      select: { id: true },
    });

    if (existing) {
      await db.wishlistItem.delete({ where: { id: existing.id } });
      return { ok: true, saved: false };
    }

    await db.wishlistItem.create({ data: { userId, productId } });
    return { ok: true, saved: true };
  } catch (err) {
    console.error("[wishlist] toggle failed:", err);
    return {
      ok: false,
      reason: "error",
      message: "Could not update your wishlist. Please try again.",
    };
  }
}
