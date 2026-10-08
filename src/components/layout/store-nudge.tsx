import {
  ArrowDown,
  ChevronDown,
  MousePointerClick,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { SwitcherNudge, SwitcherNudgeIcon } from "@/lib/site-content";

/** Built-in icons an admin can choose in /admin/site. */
const ICONS: Record<SwitcherNudgeIcon, LucideIcon> = {
  chevron: ChevronDown,
  arrow: ArrowDown,
  pointer: MousePointerClick,
  sparkle: Sparkles,
};

/**
 * The hint that points shoppers at the store control: a badge with a built-in
 * icon (or a custom image the admin uploaded) and an optional label, bobbing
 * down at the control. Rendered by the header switcher and, without the
 * animation, by the admin preview so both stay in sync.
 */
export function StoreNudge({
  nudge,
  animated = true,
  className = "",
}: {
  nudge: SwitcherNudge;
  animated?: boolean;
  className?: string;
}) {
  if (!nudge.enabled) return null;
  const Icon = ICONS[nudge.icon] ?? ChevronDown;

  return (
    <span
      aria-hidden
      className={`flex items-center gap-1.5 ${
        animated ? "store-switcher-nudge" : ""
      } ${className}`}
    >
      {nudge.text && (
        <span className="rounded-full bg-point-500 px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-white shadow-md">
          {nudge.text}
        </span>
      )}
      {nudge.image ? (
        // Admin-uploaded image: keep it as a plain <img> like the other
        // admin-supplied artwork (arbitrary formats, no layout box to know).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={nudge.image}
          alt=""
          className="h-7 w-auto drop-shadow-md"
        />
      ) : (
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-point-500 text-white shadow-md ring-2 ring-white/70">
          <Icon className="h-4 w-4" strokeWidth={3} />
        </span>
      )}
    </span>
  );
}
