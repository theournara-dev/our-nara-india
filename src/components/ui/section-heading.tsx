import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}

/** Consistent section header with optional "view all" link. */
export function SectionHeading({ eyebrow, title, href, linkLabel, className }: SectionHeadingProps) {
  return (
    <div className={cn("mb-6 flex items-end justify-between gap-4", className)}>
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-2xl font-semibold text-zinc-900 sm:text-3xl">{title}</h2>
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="hidden items-center gap-1 text-sm font-medium text-zinc-600 hover:text-zinc-900 sm:inline-flex"
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
