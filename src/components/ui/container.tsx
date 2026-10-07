import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

/**
 * Fixed-width content wrapper that keeps the layout centered with consistent
 * horizontal padding across breakpoints. `wide` matches the original
 * storefront's listing pages (~98% of the viewport up to 1560px).
 */
export function Container({
  className,
  wide = false,
  ...props
}: HTMLAttributes<HTMLDivElement> & { wide?: boolean }) {
  return (
    <div
      className={cn(
        wide
          ? "mx-auto w-[98%] max-w-[1560px] px-2"
          : "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8",
        className,
      )}
      {...props}
    />
  );
}
