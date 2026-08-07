import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = { title: "Login" };

/** Login form mirroring the original member login: ID + password, sign-in,
 *  guest checkout, and forgot-ID/password / join links. */
export default function LoginPage() {
  return (
    <div>
      <Container className="py-12">
        <div className="mx-auto max-w-md">
          <h1 className="mb-1 text-center font-display text-3xl font-semibold text-ink">
            Login
          </h1>
          <p className="mb-8 text-center text-sm text-[#888]">
            Welcome back to OUR:NARA
          </p>

          <form className="space-y-4 border border-[#e9e9e9] bg-white p-8">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[#222]">
                ID
              </span>
              <input
                type="text"
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
                autoComplete="current-password"
                className="h-11 w-full rounded border border-[#e9e9e9] bg-white px-3 text-sm text-[#222] outline-none focus:border-point-500"
              />
            </label>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="h-11 flex-1 rounded bg-point-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-point-600"
              >
                Sign In
              </button>
              <button
                type="button"
                title="Guest checkout will be available with the order milestone"
                className="h-11 flex-1 cursor-not-allowed rounded border border-[#e9e9e9] px-4 text-sm font-medium text-[#555]"
              >
                Guest Checkout
              </button>
            </div>

            <div className="flex items-center justify-center gap-4 pt-1 text-xs text-[#888]">
              <Link href="/help" className="hover:text-point-500">
                Forgot ID
              </Link>
              <span aria-hidden="true">|</span>
              <Link href="/help" className="hover:text-point-500">
                Forgot Password
              </Link>
            </div>
          </form>

          <div className="mt-4 text-center text-sm text-[#666]">
            New to OUR:NARA?{" "}
            <Link
              href="/join"
              className="font-semibold text-point-500 hover:underline"
            >
              Join
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
