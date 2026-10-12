import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { getEvents, type EventCard } from "@/data/events";

export const metadata: Metadata = { title: "Events" };

// Events are managed in the admin, so the page must reflect the database on
// every request instead of being cached from the first render.
export const dynamic = "force-dynamic";

/**
 * /event (client slide 10): image cards with the text in the bottom-left
 * corner. No eyebrow or subtitle — just the title, then the cards. Everything
 * is managed in /admin/events.
 */
export default async function EventPage() {
  const events = await getEvents();

  return (
    <div>
      <PageHeader title="Events" />
      <Container className="pb-16">
        {events.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-400">
            No events are running right now. Check back soon.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {events.map((event) => (
              <EventCardView key={event.id} event={event} />
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}

function EventCardView({ event }: { event: EventCard }) {
  const inner = (
    <>
      {event.image ? (
        <>
          <Image
            src={event.image}
            alt={event.title}
            width={1200}
            height={700}
            unoptimized
            className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.02]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent"
          />
        </>
      ) : (
        // Without artwork the card is still a panel: the same layout over the
        // brand gradient, with the text readable on its own.
        <span
          aria-hidden
          className="block aspect-[12/7] w-full bg-gradient-to-br from-point-600 via-point-500 to-point-400"
        />
      )}
      <span className="absolute bottom-5 left-6 right-6 block text-left">
        {event.dateLabel && (
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-white/80">
            {event.dateLabel}
          </span>
        )}
        <span className="block text-lg font-bold leading-snug text-white drop-shadow md:text-2xl">
          {event.title}
        </span>
        {event.text && (
          <span className="mt-1 block text-xs font-medium text-white/90 drop-shadow md:text-sm">
            {event.text}
          </span>
        )}
      </span>
    </>
  );

  const className = "group relative block overflow-hidden rounded-2xl";

  return event.href ? (
    <Link href={event.href} className={className}>
      {inner}
    </Link>
  ) : (
    <article className={className}>{inner}</article>
  );
}
