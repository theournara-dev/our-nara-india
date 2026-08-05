import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <div>
      <PageHeader eyebrow="Welcome back" title="Login" />
      <Container className="pb-16">
        <form className="mx-auto max-w-md space-y-4 rounded-2xl border border-zinc-100 bg-white p-8">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">
              Email
            </span>
            <input
              type="email"
              name="email"
              autoComplete="email"
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
              autoComplete="current-password"
              className="h-11 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400"
            />
          </label>
          <button
            type="submit"
            className="h-11 w-full rounded-full bg-zinc-900 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Login
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
