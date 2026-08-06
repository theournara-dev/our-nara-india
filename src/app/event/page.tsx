import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { events } from "@/data/content";

export const metadata: Metadata = { title: "Events" };

export default function EventPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Promotions"
        title="Events"
        subtitle="Current promotions and happenings at OUR:NARA."
      />
      <Container className="pb-16">
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex flex-col rounded-2xl bg-gradient-to-br from-point-50 to-white p-8 ring-1 ring-point-100"
            >
              <div className="mb-3 flex items-center gap-2">
                {event.badge && <Badge tone="accent">{event.badge}</Badge>}
                <span className="text-xs text-zinc-400">{event.date}</span>
              </div>
              <h2 className="text-xl font-semibold text-zinc-900">
                {event.title}
              </h2>
              <p className="mt-2 flex-1 text-sm text-zinc-600">
                {event.description}
              </p>
              <Button
                href="/coupons"
                variant="outline"
                size="sm"
                className="mt-5 self-start"
              >
                See coupons
              </Button>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
