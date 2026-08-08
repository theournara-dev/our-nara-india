import { cn } from "@/lib/utils";

export type Step = { label: string };

/** Numbered step indicator for the join wizard (mirrors the original's
 *  "1 Policies · 2 Create Profile · 3 Complete" header). */
export function StepIndicator({
  steps,
  current,
}: {
  steps: Step[];
  current: number; // 1-based
}) {
  return (
    <ol className="mb-8 flex items-center justify-center gap-2 sm:gap-4">
      {steps.map((step, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={step.label} className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                  done && "border-point-500 bg-point-500 text-white",
                  active && "border-point-500 text-point-500",
                  !done && !active && "border-[#e9e9e9] text-zinc-400",
                )}
              >
                {done ? "✓" : n}
              </span>
              <span
                className={cn(
                  "text-sm",
                  active ? "font-semibold text-ink" : "text-zinc-400",
                )}
              >
                {step.label}
              </span>
            </div>
            {n < steps.length && (
              <span className="h-px w-6 bg-[#e9e9e9] sm:w-10" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
