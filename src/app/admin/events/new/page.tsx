import { EventForm } from "@/components/admin/event-form";

export const dynamic = "force-dynamic";

export default function NewEventPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">New event</h1>
      <EventForm event={null} backHref="/admin/events" />
    </div>
  );
}
