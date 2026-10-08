"use client";

import Image from "next/image";
import { useState } from "react";
import { useSiteVersion } from "@/components/site-version-provider";

/**
 * The K-Drop logo shown before product names on the International storefront.
 * Admins can override it per store in /admin/site ("Product-title logo").
 */
export const KDROP_LOGO_SRC = "/kdrop-logo.png";

/**
 * "K-Drop" mark shown before a product name on the International storefront, so
 * a shopper can tell which store a product ships from. Renders nothing on the
 * India store, and hides itself if the logo file is missing.
 *
 * Size it with a height class (`h-[30px]`, `h-[14px]`, …) — the width follows
 * the logo's 756×143 aspect ratio.
 */
export function KDropMark({ className = "h-5" }: { className?: string }) {
  const { version, brandLogo } = useSiteVersion();
  const [failed, setFailed] = useState(false);
  // The logo uploaded in the admin wins; otherwise the bundled K-Drop file.
  const src = brandLogo || KDROP_LOGO_SRC;
  if (version !== "global" || failed) return null;
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
