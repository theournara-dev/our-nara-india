import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { EventCardView } from "@/components/events/event-card";
import { getEvents } from "@/data/events";

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
