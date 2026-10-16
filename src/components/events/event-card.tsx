import Image from "next/image";
import Link from "next/link";
import { eventBackgroundStyle } from "@/lib/event-background";

/**
 * One /event card (client slide 10): a square image box whose title and text sit
 * in the bottom-left corner. With artwork the image covers the whole card
 * (cropped); without it the card renders on the admin-chosen colour (or the
 * brand purple).
 *
 * The artwork's framing — focus point and zoom — comes from the admin's
 * background editor (client's slide 6) through `eventBackgroundStyle`, so the
 * card and that editor's preview are the same picture.
 *
 * Shared by the storefront and the admin form's live preview so an editor sees
 * exactly what visitors get.
 */

/** Fallback background when a card has no artwork and no colour set. */
export const EVENT_DEFAULT_COLOR = "#6f2dbd";

/**
 * The client's slide 10: "an image will be inserted to fit the square box", so
 * every card is a 1:1 box whatever the upload's own ratio.
 */
const CARD_SHAPE = "aspect-square";

export interface EventCardData {
  title: string;
  text?: string | null;
  dateLabel?: string | null;
  image?: string | null;
  color?: string | null;
  href?: string | null;
  /** Where the artwork focuses, 0–100; see `event-background.ts`. */
  imageFocusX?: number | null;
  imageFocusY?: number | null;
  /** Magnification as a percentage, 100 being the plain cover. */
  imageZoom?: number | null;
}

export function EventCardView({ event }: { event: EventCardData }) {
  const color = event.color?.trim() || EVENT_DEFAULT_COLOR;

  const inner = (
    <>
      {event.image ? (
        <>
          {/* The hover zoom lives on the frame, the admin's framing on the
              image inside it, so the two never overwrite each other. */}
          <span className="absolute inset-0 block transition-transform duration-500 group-hover:scale-[1.02]">
            <Image
              src={event.image}
              alt={event.title || "Event"}
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              style={eventBackgroundStyle({
                focusX: event.imageFocusX ?? undefined,
                focusY: event.imageFocusY ?? undefined,
                zoom: event.imageZoom ?? undefined,
              })}
            />
          </span>
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

  const className = `group relative block ${CARD_SHAPE} overflow-hidden rounded-2xl`;

  return event.href ? (
    <Link href={event.href} className={className}>
      {inner}
    </Link>
  ) : (
    <article className={className}>{inner}</article>
  );
}
