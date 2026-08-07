"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MdKeyboardArrowUp, MdOutlineHistory } from "react-icons/md";

const SHOW_AFTER = 300;

/**
 * Floating action buttons on the right edge: open recently-viewed products and
 * scroll to top. Hidden at the top of the page and revealed smoothly once the
 * user scrolls down.
 */
export function FloatingButtons() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div
      className={`fixed bottom-28 right-5 z-50 flex flex-col gap-3 transition-opacity duration-300 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <Link
        href="/recent-view"
        aria-label="Recently viewed products"
        title="Recently viewed"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white shadow-md hover:opacity-70"
      >
        <MdOutlineHistory size={22} />
      </Link>
      <button
        type="button"
        onClick={scrollTop}
        aria-label="Scroll to top"
        title="Scroll to top"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#222] shadow-md hover:opacity-70"
      >
        <MdKeyboardArrowUp size={26} />
      </button>
    </div>
  );
}
