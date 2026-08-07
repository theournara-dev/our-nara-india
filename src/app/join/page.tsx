import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = { title: "Join" };

/** Join form mirroring the original member join: ID, password, name, email,
 *  phone and a Create Account button, styled to match the theme. */
export default function JoinPage() {
  return (
    <div>
      <Container className="py-12">
        <div className="mx-auto max-w-md">
          <h1 className="mb-1 text-center font-display text-3xl font-semibold text-ink">
            Join
          </h1>
          <p className="mb-8 text-center text-sm text-[#888]">
            Sign up to track orders, save wishlists and collect mileage.
          </p>

          <form className="space-y-4 border border-[#e9e9e9] bg-white p-8">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[#222]">
                ID
              </span>
              <input
                name="member_id"
                autoComplete="username"
                className="h-11 w-full rounded border border-[#e9e9e9] bg-white px-3 text-sm text-[#222] outline-none focus:border-point-500"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[#222]">
                Password
              </span>
              <input
                type="password"
                name="member_passwd"
                autoComplete="new-password"
                className="h-11 w-full rounded border border-[#e9e9e9] bg-white px-3 text-sm text-[#222] outline-none focus:border-point-500"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[#222]">
                Name
              </span>
              <input
                name="name"
                className="h-11 w-full rounded border border-[#e9e9e9] bg-white px-3 text-sm text-[#222] outline-none focus:border-point-500"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[#222]">
                Email
              </span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                className="h-11 w-full rounded border border-[#e9e9e9] bg-white px-3 text-sm text-[#222] outline-none focus:border-point-500"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[#222]">
                Phone
              </span>
              <input
                type="tel"
                name="phone"
                autoComplete="tel"
                className="h-11 w-full rounded border border-[#e9e9e9] bg-white px-3 text-sm text-[#222] outline-none focus:border-point-500"
              />
            </label>

            <button
              type="submit"
              className="h-11 w-full rounded bg-point-500 text-sm font-semibold text-white transition-colors hover:bg-point-600"
            >
              Create Account
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-[#666]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-point-500 hover:underline"
            >
              Login
            </Link>
          </div>

          <p className="mt-6 text-center text-xs text-zinc-400">
            Accounts will be enabled with the auth milestone. This is a static
            preview.
          </p>
        </div>
      </Container>
    </div>
  );
}
