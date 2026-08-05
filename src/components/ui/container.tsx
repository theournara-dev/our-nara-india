import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

/**
 * Fixed-width content wrapper that keeps the layout centered with consistent
 * horizontal padding across breakpoints.
 */
export function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)} {...props} />
  );
}
