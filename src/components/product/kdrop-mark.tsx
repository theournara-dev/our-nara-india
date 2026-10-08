"use client";

import Image from "next/image";
import { useState } from "react";
import { useSiteVersion } from "@/components/site-version-provider";

/**
 * The K-Drop wordmark file used as a prefix on International-store product
 * titles. Drop the artwork in at this path (png/webp, wide logo format).
 */
export const KDROP_LOGO_SRC = "/upload/kdrop-logo.png";

/**
 * "K-Drop" mark shown before a product title on the International storefront,
 * so a shopper can tell which store the product ships from. Renders nothing on
 * the India store, and hides itself if the logo file is missing so a title is
 * never broken by a missing asset.
 */
export function KDropMark({ className = "h-5" }: { className?: string }) {
  const { version } = useSiteVersion();
  const [failed, setFailed] = useState(false);
  if (version !== "global" || failed) return null;
  return (
    <Image
      src={KDROP_LOGO_SRC}
      alt="K-Drop"
      width={1034}
      height={196}
      unoptimized
      onError={() => setFailed(true)}
      className={`inline-block w-auto ${className}`}
    />
  );
}
