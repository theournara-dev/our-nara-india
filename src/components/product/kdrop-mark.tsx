"use client";

import Image from "next/image";
import { useState } from "react";
import { useSiteVersion } from "@/components/site-version-provider";

/**
 * The K-Drop wordmark file used as a prefix on International-store product
 * titles. Drop the artwork in at this path (wide logo, png/webp/svg) and it is
 * used everywhere; until then the drawn stand-in below is shown.
 */
export const KDROP_LOGO_SRC = "/upload/kdrop-logo.png";

/**
 * "K-Drop" mark shown before a product name on the International storefront, so
 * a shopper can tell which store a product ships from. Renders nothing on the
 * India store. The artwork is `KDROP_LOGO_SRC`; if that file is missing the
 * drawn stand-in takes its place, so the mark is never a broken image.
 *
 * Size it with a height class (`h-[30px]`, `h-[14px]`, …) — the width follows
 * the logo's aspect ratio.
 */
export function KDropMark({ className = "h-5" }: { className?: string }) {
  const { version } = useSiteVersion();
  const [failed, setFailed] = useState(false);
  if (version !== "global") return null;
  if (failed) return <KDropStandInMark className={className} />;
  return (
    <Image
      src={KDROP_LOGO_SRC}
      alt="K-Drop"
      width={1034}
      height={196}
      unoptimized
      data-kdrop-mark
      onError={() => setFailed(true)}
      className={`inline-block w-auto ${className}`}
    />
  );
}

/**
 * Drawn stand-in for the K-Drop wordmark: motion dashes, a paper plane and the
 * wordmark in the brand gradient. Used only when the artwork file is missing —
 * adding `public/upload/kdrop-logo.png` replaces it automatically.
 */
function KDropStandInMark({ className = "h-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1034 196"
      role="img"
      aria-label="K-Drop"
      data-kdrop-mark
      className={`inline-block w-auto ${className}`}
    >
      <defs>
        <linearGradient
          id="kdrop-mark-gradient"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="98"
          x2="1034"
          y2="98"
        >
          <stop offset="0" stopColor="#ff2e63" />
          <stop offset="0.4" stopColor="#2f6bff" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <g fill="url(#kdrop-mark-gradient)">
        <rect x="4" y="54" width="112" height="26" rx="13" />
        <rect x="26" y="112" width="84" height="26" rx="13" />
        <g transform="translate(136 4) scale(7.4) rotate(-16 12 12)">
          <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
        </g>
        <text
          x="366"
          y="150"
          fontFamily="Poppins, Montserrat, 'Segoe UI', system-ui, sans-serif"
          fontSize="150"
          fontWeight="800"
          letterSpacing="-4"
        >
          K-Drop
        </text>
      </g>
    </svg>
  );
}
