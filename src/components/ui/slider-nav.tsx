import type { ReactNode, RefObject } from "react";
import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from "react-icons/md";
import { cn } from "@/lib/utils";

interface SliderNavProps {
  /** Ref for the Swiper progressbar element. */
  paginationRef: RefObject<HTMLDivElement | null>;
  /** Swiper pagination variant, e.g. "swiper-pagination-main". */
  paginationClassName?: string;
  onPrev: () => void;
  onNext: () => void;
  canPrev?: boolean;
  canNext?: boolean;
  /** Extra controls rendered after the arrows (e.g. play/pause). */
  children?: ReactNode;
  className?: string;
}

/**
 * Slider navigation bar: Swiper progressbar + prev/next arrows (with optional
 * extra controls). The arrows dim when the corresponding edge is reached.
 */
export function SliderNav({
  paginationRef,
  paginationClassName = "swiper-pagination",
  onPrev,
  onNext,
  canPrev = true,
  canNext = true,
  children,
  className,
}: SliderNavProps) {
  return (
    <div
      className={cn(
        "mx-auto mt-4 flex w-[56vw] items-center justify-center gap-3 max-md:w-[80vw]",
        className,
      )}
    >
      <div
        ref={paginationRef}
        className={cn(
          "swiper-pagination relative! h-1 flex-1",
          paginationClassName,
        )}
      />
      <div className="flex items-center">
        <button
          type="button"
          aria-label="Previous"
          onClick={onPrev}
          className={`relative flex h-10 w-10 shrink-0 items-center justify-center transition-opacity duration-200 hover:opacity-50 ${
            canPrev ? "opacity-100" : "opacity-35"
          }`}
        >
          <MdKeyboardArrowLeft size={28} />
        </button>
        <div className="h-3 w-px bg-gray-200" />
        <button
          type="button"
          aria-label="Next"
          onClick={onNext}
          className={`relative flex h-10 w-10 shrink-0 items-center justify-center transition-opacity duration-200 hover:opacity-50 ${
            canNext ? "opacity-100" : "opacity-35"
          }`}
        >
          <MdKeyboardArrowRight size={28} />
        </button>
      </div>
      {children}
    </div>
  );
}
