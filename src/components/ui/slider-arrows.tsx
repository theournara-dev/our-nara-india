import { MdKeyboardArrowLeft, MdKeyboardArrowRight } from "react-icons/md";

interface SliderArrowsProps {
  onPrev: () => void;
  onNext: () => void;
  canPrev?: boolean;
  canNext?: boolean;
}

/**
 * Reusable prev/next arrows for any slider/carousel. The arrows are dimmed
 * (but still clickable) when the corresponding edge is reached.
 */
export function SliderArrows({
  onPrev,
  onNext,
  canPrev = true,
  canNext = true,
}: SliderArrowsProps) {
  return (
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
  );
}
