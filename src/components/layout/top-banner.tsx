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
 * Auto-rotating top banner with a close button. Closing animates the height
 * down to 0 over 0.5s (minimizing) before unmounting.
 */
export function TopBanner() {
  const [closing, setClosing] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      2500,
    );
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(() => setHidden(true), 500);
    return () => clearTimeout(t);
  }, [closing]);

  if (hidden) return null;

  const current = slides[index];
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden text-center text-xs font-medium transition-all duration-500 ease-in-out ${
        closing ? "h-0 opacity-0" : "h-9 opacity-100"
      } ${current.className}`}
    >
      <span>{current.text}</span>
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
