import Image from "next/image";
import Link from "next/link";

/**
 * One /event card (client slide 10): a fixed-height block whose title and text
 * sit in the bottom-left corner. With artwork the image fills the block; without
 * it the card renders on the admin-chosen colour (or the brand purple).
 *
 * Shared by the storefront and the admin form's live preview so an editor sees
 * exactly what visitors get.
 */

/** Fallback background when a card has no artwork and no colour set. */
export const EVENT_DEFAULT_COLOR = "#6f2dbd";

/** The cards are all one height, so every event lines up in the grid. */
const CARD_HEIGHT = "h-[300px] md:h-[360px]";

export interface EventCardData {
  title: string;
  text?: string | null;
  dateLabel?: string | null;
  image?: string | null;
  color?: string | null;
  href?: string | null;
}

export function EventCardView({ event }: { event: EventCardData }) {
  const color = event.color?.trim() || EVENT_DEFAULT_COLOR;

  const inner = (
    <>
      {event.image ? (
        <>
          <Image
            src={event.image}
            alt={event.title || "Event"}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent"
          />
        </>
      ) : (
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 78%, black))`,
          }}
        />
      )}
      <span className="absolute bottom-5 left-6 right-6 block text-left">
        {event.dateLabel && (
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-white/85">
            {event.dateLabel}
          </span>
        )}
        <span className="block text-lg font-bold leading-snug text-white drop-shadow md:text-2xl">
          {event.title || "Untitled event"}
        </span>
        {event.text && (
          <span className="mt-1 block text-xs font-medium text-white/90 drop-shadow md:text-sm">
            {event.text}
          </span>
        )}
      </span>
    </>
  );

  const className = `group relative block ${CARD_HEIGHT} overflow-hidden rounded-2xl`;

  return event.href ? (
    <Link href={event.href} className={className}>
      {inner}
    </Link>
  ) : (
    <article className={className}>{inner}</article>
  );
}
