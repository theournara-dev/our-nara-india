import type { Metadata } from "next";
import { MapPin, Clock } from "lucide-react";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { stores } from "@/data/content";

export const metadata: Metadata = { title: "Stores" };

export default function StoresPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Find Us"
        title="Stores"
        subtitle="Visit OUR:NARA at our India and South Korea offices."
      />
      <Container className="pb-16">
        <div className="grid gap-4 md:grid-cols-2">
          {stores.map((store) => (
            <div
              key={store.id}
              className="rounded-2xl border border-zinc-100 bg-white p-6"
            >
              <p className="text-lg font-semibold text-zinc-900">
                {store.name}
              </p>
              <p className="mt-1 text-sm text-zinc-400">{store.city}</p>
              <p className="mt-4 flex items-start gap-2 text-sm text-zinc-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                {store.address}
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm text-zinc-600">
                <Clock className="h-4 w-4 shrink-0 text-zinc-400" />
                {store.hours}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
