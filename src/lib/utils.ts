import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge conditional class names with tailwind-merge, deduping conflicting
 * Tailwind utilities. Use everywhere you'd otherwise template a className.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
