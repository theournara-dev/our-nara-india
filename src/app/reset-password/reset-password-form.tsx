"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { isRateLimit, notifyRateLimit } from "@/lib/errors";
import { notify } from "@/lib/toast";
import { PasswordInput } from "@/components/ui/password-input";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      notify.error("Passwords do not match", "Please retype the new password.");
      return;
    }
    setLoading(true);
    const id = notify.loading("Saving your new password…");
    try {
      const res = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (res.error) {
        if (isRateLimit(res.error)) {
          notifyRateLimit(id);
          return;
        }
        notify.error(
          id,
          "Could not reset the password",
          res.error.message ?? "Request a new link.",
        );
        return;
      }
      notify.success(id, "Password updated", "Sign in with your new password.");
      setDone(true);
    } catch (err) {
      notify.error(
        id,
        "Could not reset the password",
        err instanceof Error ? err.message : "Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-4 border border-[#e9e9e9] bg-white p-8 text-center">
        <p className="text-sm leading-6 text-[#666]">
          Your password has been updated. For safety, other sessions were
          signed out.
        </p>
        <Link
          href="/login"
          className="inline-flex h-11 w-full items-center justify-center rounded bg-point-500 text-sm font-semibold text-white transition-colors hover:bg-point-600"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 border border-[#e9e9e9] bg-white p-8"
    >
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-[#222]">
          New password
        </span>
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
          className="h-11 w-full rounded border border-[#e9e9e9] bg-white px-3 text-sm text-[#222] outline-none focus:border-point-500"
        />
        <span className="mt-1 block text-xs text-[#888]">
          At least 8 characters.
        </span>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-[#222]">
          Confirm new password
        </span>
        <PasswordInput
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
          className="h-11 w-full rounded border border-[#e9e9e9] bg-white px-3 text-sm text-[#222] outline-none focus:border-point-500"
        />
      </label>
      <button
        type="submit"
        disabled={loading || password.length < 8}
        className="h-11 w-full rounded bg-point-500 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
      >
        {loading ? "Saving…" : "Save new password"}
      </button>
      <p className="pt-1 text-center text-xs text-[#888]">
        Link expired?{" "}
        <Link
          href="/forgot-password"
          className="text-point-500 hover:underline"
        >
          Request a new one
        </Link>
      </p>
    </form>
  );
}
