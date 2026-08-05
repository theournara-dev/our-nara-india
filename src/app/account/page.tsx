import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Page" };

export default function AccountOverviewPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900">Overview</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-100 bg-white p-5">
          <p className="text-sm text-zinc-500">Orders</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">0</p>
        </div>
        <div className="rounded-2xl border border-zinc-100 bg-white p-5">
          <p className="text-sm text-zinc-500">Mileage</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">0P</p>
        </div>
        <div className="rounded-2xl border border-zinc-100 bg-white p-5">
          <p className="text-sm text-zinc-500">Wishlist</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">0</p>
        </div>
      </div>
      <p className="mt-8 text-sm text-zinc-500">
        This is a static preview of the account area. Login and order history
        will be available once accounts and purchases are enabled.
      </p>
    </div>
  );
}
