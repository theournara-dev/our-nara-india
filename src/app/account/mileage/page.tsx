import { Badge } from "@/components/ui/badge";

export default function AccountMileagePage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Mileage</h1>
      <div className="rounded-2xl border border-zinc-100 bg-white p-6">
        <p className="text-sm text-zinc-500">Available mileage</p>
        <p className="text-3xl font-semibold text-zinc-900">0P</p>
        <p className="mt-2 text-xs text-zinc-400">Earn points on paid orders and use them at checkout.</p>
      </div>
      <div className="mt-6 rounded-2xl border border-dashed border-zinc-200 bg-white p-10 text-center">
        <p className="text-sm text-zinc-500">
          <Badge tone="outline">No history yet</Badge>
        </p>
      </div>
    </div>
  );
}
