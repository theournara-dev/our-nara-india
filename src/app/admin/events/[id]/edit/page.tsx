import { notFound } from "next/navigation";
import { EventForm } from "@/components/admin/event-form";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await db.event.findUnique({ where: { id } });
  if (!event) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Edit event</h1>
      <EventForm event={event} backHref="/admin/events" />
    </div>
  );
}
