import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Join" };

export default function JoinPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Create an account"
        title="Join"
        subtitle="Sign up to track orders, save wishlists and collect mileage."
      />
      <Container className="pb-16">
        <form className="mx-auto max-w-md space-y-4 rounded-2xl border border-zinc-100 bg-white p-8">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">
              Name
            </span>
            <input
              name="name"
              className="h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">
              Email
            </span>
            <input
              type="email"
              name="email"
              className="h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">
              Phone
            </span>
            <input
              type="tel"
              name="phone"
              className="h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">
              Password
            </span>
            <input
              type="password"
              name="password"
              className="h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400"
            />
          </label>
          <button
            type="submit"
            className="h-11 w-full rounded-full bg-zinc-900 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Create account
          </button>
          <p className="text-center text-xs text-zinc-400">
            Accounts will be enabled with the auth milestone. This is a static
            preview.
          </p>
        </form>
      </Container>
    </div>
  );
}
