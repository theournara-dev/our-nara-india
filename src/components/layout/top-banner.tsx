"use client";

import { useEffect, useState } from "react";

const slides = [
  {
    text: "Your new K-Beauty destination 🎁",
    className: "bg-point-500 text-white",
  },
  { text: "Korean beauty, now in India", className: "bg-zinc-900 text-white" },
];

/**
 * Auto-rotating top banner with a close button — replicates the original
 * site's scrolling "topBanner" strip.
 */
export function TopBanner() {
  const [hidden, setHidden] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      2500,
    );
    return () => clearInterval(id);
  }, []);

  if (hidden) return null;

  const current = slides[index];
  return (
    <div
      className={`relative flex h-9 items-center justify-center text-center text-xs font-medium transition-colors ${current.className}`}
    >
      <span>{current.text}</span>
      <button
        type="button"
        onClick={() => setHidden(true)}
        aria-label="Close banner"
        className="absolute right-4 text-sm opacity-70 transition-opacity hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}
