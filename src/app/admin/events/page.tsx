import Link from "next/link";
import { EventsTable } from "@/components/admin/events-table";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Event management: the /event page's campaign cards. */
export default async function AdminEventsPage() {
  const events = await db.event.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-zinc-900">Events</h1>
          <p className="text-sm text-zinc-500">
            {events.length} event{events.length === 1 ? "" : "s"}. These are the
            cards on the /event page: an image with the title and text over its
            bottom-left corner.
          </p>
        </div>
        <Link
          href="/admin/events/new"
          className="inline-flex h-9 items-center rounded bg-point-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-point-600"
        >
          + New event
        </Link>
      </div>
      <EventsTable events={events} />
    </div>
  );
}
