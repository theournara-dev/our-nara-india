"use client";

import { useState } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { notify } from "@/lib/toast";
import { requestMemberId } from "./actions";

export default function ForgotIdPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const id = notify.loading("Sending your member ID…");
    try {
      const res = await requestMemberId({ email });
      if (!res.ok) {
        notify.error(id, "Could not send your ID", res.message);
        return;
      }
      notify.success(id, "Check your email", `We sent a reminder to ${email}.`);
      setSent(true);
    } catch {
      notify.error(id, "Could not send your ID", "Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-md">
        <h1 className="mb-1 text-center font-category text-3xl font-semibold text-ink">
          Forgot ID
        </h1>
        <p className="mb-8 text-center text-sm text-[#888]">
          We will email the member ID registered to your address.
        </p>

        {sent ? (
          <div className="space-y-4 border border-[#e9e9e9] bg-white p-8 text-center">
            <p className="text-sm leading-6 text-[#666]">
              If an account exists for{" "}
              <span className="font-semibold text-[#222]">{email}</span>, its
              member ID is on its way. The email comes from OUR:NARA.
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
              {loading ? "Sending…" : "Email my member ID"}
            </button>
            <p className="pt-1 text-center text-xs text-[#888]">
              Forgot the password too?{" "}
              <Link
                href="/forgot-password"
                className="text-point-500 hover:underline"
              >
                Reset it
              </Link>
            </p>
          </form>
        )}
      </div>
    </Container>
  );
}
