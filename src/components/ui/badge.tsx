import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

const badgeStyles = {
  default: "bg-zinc-100 text-zinc-700",
  accent: "bg-amber-100 text-amber-800",
  outline: "border border-zinc-300 text-zinc-700",
} as const;

export function Badge({
  className,
  tone = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof badgeStyles }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide",
        badgeStyles[tone],
        className,
      )}
      {...props}
    />
  );
}
