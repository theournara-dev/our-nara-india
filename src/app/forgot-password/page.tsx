"use client";

import { useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { authClient } from "@/lib/auth-client";
import { isRateLimit, notifyRateLimit } from "@/lib/errors";
import { notify } from "@/lib/toast";

/** Ask Better Auth to email a reset link. The response is always the same so
 *  the page cannot be used to find out which addresses have accounts. */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const id = notify.loading("Sending the reset link…");
    try {
      const res = await authClient.requestPasswordReset({
        email: email.trim().toLowerCase(),
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (res.error) {
        if (isRateLimit(res.error)) {
          notifyRateLimit(id);
          return;
        }
        notify.error(id, "Could not send the link", res.error.message);
        return;
      }
      notify.success(id, "Check your email", `We sent a link to ${email}.`);
      setSent(true);
    } catch (err) {
      notify.error(
        id,
        "Could not send the link",
        err instanceof Error ? err.message : "Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-md">
        <h1 className="mb-1 text-center font-category text-3xl font-semibold text-ink">
          Forgot Password
        </h1>
        <p className="mb-8 text-center text-sm text-[#888]">
          We will email you a link to choose a new password.
        </p>

        {sent ? (
          <div className="space-y-4 border border-[#e9e9e9] bg-white p-8 text-center">
            <p className="text-sm leading-6 text-[#666]">
              If an account exists for{" "}
              <span className="font-semibold text-[#222]">{email}</span>, a
              reset link is on its way. The link expires in 1 hour.
            </p>
            <Link
              href="/login"
              className="inline-flex h-11 w-full items-center justify-center rounded bg-point-500 text-sm font-semibold text-white transition-colors hover:bg-point-600"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 border border-[#e9e9e9] bg-white p-8"
          >
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-[#222]">
                Email address
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@email.com"
                required
                className="h-11 w-full rounded border border-[#e9e9e9] bg-white px-3 text-sm text-[#222] outline-none focus:border-point-500"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded bg-point-500 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
            <p className="pt-1 text-center text-xs text-[#888]">
              Remembered it?{" "}
              <Link href="/login" className="text-point-500 hover:underline">
                Login
              </Link>
            </p>
          </form>
        )}
      </div>
    </Container>
  );
}
