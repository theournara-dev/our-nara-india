"use client";

import Image from "next/image";
import { useState } from "react";
import { useSiteVersion } from "@/components/site-version-provider";

/**
 * The K-Drop logo shown before globally available product names.
 * Admins can override it per store in /admin/site ("Product-title logo").
 */
export const KDROP_LOGO_SRC = "/kdrop-logo.png";

/**
 * "K-Drop" mark shown before a product name, so a shopper can tell the product
 * also ships from the International (K-Drop) store. It follows the product, not
 * the storefront: pass `availableGlobally` (the product's own global-store
 * visibility — `visibleForVersion(product, "global")` on catalogue products,
 * the flag captured on cart lines) and a product sold only on the India store
 * renders no mark even on the India storefront. Hides itself if the logo file
 * is missing.
 *
 * Size it with a height class (`h-[30px]`, `h-[14px]`, …) — the width follows
 * the logo's 756×143 aspect ratio.
 */
export function KDropMark({
  availableGlobally,
  className = "h-5",
}: {
  /** Whether the product is listed on the International (K-Drop) store. */
  availableGlobally: boolean;
  className?: string;
}) {
  const { brandLogo } = useSiteVersion();
  const [failed, setFailed] = useState(false);
  // The logo uploaded in the admin wins; otherwise the bundled K-Drop file.
  const src = brandLogo || KDROP_LOGO_SRC;
  if (!availableGlobally || failed) return null;
  return (
    <Image
      key={src}
      src={src}
      alt="K-Drop"
      width={756}
      height={143}
      unoptimized
      data-kdrop-mark
      onError={() => setFailed(true)}
      className={`inline-block w-auto ${className}`}
    />
  );
}
