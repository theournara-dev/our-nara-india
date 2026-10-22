"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { withSaved } from "@/lib/wishlist";

type WishlistContextValue = {
  /** Product ids the signed-in visitor has saved. */
  saved: string[];
  isSaved: (productId: string) => boolean;
  /** Local update after a successful toggle; the server list is authoritative. */
  setSaved: (productId: string, saved: boolean) => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

/**
 * Seeds the saved-product ids from the server (root layout) so every heart —
 * card, product page, account wishlist — paints in the right state on the
 * first render instead of starting empty and waiting for a click.
 */
export function WishlistProvider({
  saved: initial,
  children,
}: {
  saved: string[];
  children: ReactNode;
}) {
  const [saved, setIds] = useState(initial);
  return (
    <WishlistContext.Provider
      value={{
        saved,
        isSaved: (productId) => saved.includes(productId),
        setSaved: (productId, on) =>
          setIds((prev) => withSaved(prev, productId, on)),
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error("useWishlist must be used inside WishlistProvider");
  }
  return ctx;
}
