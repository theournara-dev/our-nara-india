"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toggleWishlist } from "@/app/actions/wishlist";
import { notify } from "@/lib/toast";

/** Remove a saved product from the wishlist (the item's own button). */
export function WishlistButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onRemove() {
    startTransition(async () => {
      const res = await toggleWishlist(productId);
      if (!res.ok) {
        notify.error("Wishlist", res.message);
        if (res.reason === "auth") router.push("/login");
        return;
      }
      notify.success("Removed from wishlist", productName);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onRemove}
      disabled={pending}
      className="inline-flex h-9 cursor-pointer items-center justify-center rounded-full border border-zinc-200 px-4 text-xs font-medium text-zinc-600 transition-colors hover:border-point-500 hover:text-point-500 disabled:opacity-60"
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}
