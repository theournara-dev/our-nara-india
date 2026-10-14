import { EventForm } from "@/components/admin/event-form";
import { loadLinkFieldOptions } from "@/lib/admin-link-options";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const options = await loadLinkFieldOptions();
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">New event</h1>
      <EventForm event={null} backHref="/admin/events" options={options} />
    </div>
  );
}
