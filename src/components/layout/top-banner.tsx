"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { TopBannerBlock } from "@/lib/site-content";

/**
 * Auto-rotating strip pinned above the header. Content comes from the admin
 * site settings (per store): each block is a line of text or an image with its
 * own colours, and the strip rotates through them. Closing animates the height
 * down to 0 over 0.5s (minimizing) before unmounting.
 */
export function TopBanner({ blocks }: { blocks: TopBannerBlock[] }) {
  const [closing, setClosing] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (blocks.length < 2) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % blocks.length),
      2500,
    );
    return () => clearInterval(id);
  }, [blocks.length]);

  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(() => setHidden(true), 500);
    return () => clearTimeout(t);
  }, [closing]);

  if (hidden || blocks.length === 0) return null;

  const current = blocks[index % blocks.length];
  const style = {
    backgroundColor: current.background,
    color: current.kind === "text" ? current.textColor : "#ffffff",
  };

  const inner =
    current.kind === "text" ? (
      <span>{current.text}</span>
    ) : (
      <Image
        src={current.image}
        alt={current.alt ?? ""}
        width={1200}
        height={34}
        unoptimized
        className="h-[34px] w-auto object-contain"
      />
    );

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden text-center text-xs font-medium transition-all duration-500 ease-in-out ${
        closing ? "h-0 opacity-0" : "h-[34px] opacity-100"
      }`}
      style={style}
    >
      {current.href ? (
        <Link href={current.href} className="inline-flex h-[34px] items-center">
          {inner}
        </Link>
      ) : (
        inner
      )}
      <button
        type="button"
        onClick={() => setClosing(true)}
        aria-label="Close banner"
        className="absolute right-4 text-sm opacity-70 transition-opacity hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}
