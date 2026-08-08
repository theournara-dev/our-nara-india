"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/container";
import { authClient } from "@/lib/auth-client";
import { RATE_LIMIT_MESSAGE, isRateLimit, notifyRateLimit } from "@/lib/errors";
import { notify } from "@/lib/toast";

/** Login form mirroring the original member login. Users can sign in with
 *  either their member ID or email, plus password, or via Google. If the email
 *  isn't verified yet, sign-in is blocked and a code-verification panel is
 *  shown instead. */
export default function LoginPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Already signed in? Send them to their account.
  useEffect(() => {
    if (!isPending && session) router.replace("/account");
  }, [session, isPending, router]);

  // Unverified-email verification panel
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const id = notify.loading("Signing in…");
    try {
      const isEmail = identifier.includes("@");
      const res = isEmail
        ? await authClient.signIn.email({ email: identifier, password })
        : await authClient.signIn.username({ username: identifier, password });
      if (res.error) {
        // Server rate limit (HTTP 429) — tell the user to wait, not just fail.
        if (isRateLimit(res.error)) {
          setError(RATE_LIMIT_MESSAGE);
          notifyRateLimit(id);
          return;
        }
        // Blocked until the email is verified — show the code panel.
        if (res.error.code === "EMAIL_NOT_VERIFIED") {
          setVerifyEmail(identifier.includes("@") ? identifier : "");
          notify.error(
            id,
            "Verify your email",
            "We sent a code to your email.",
          );
          return;
        }
        // Account blocked by an admin — surface the banned message clearly.
        if (res.error.code === "BANNED_USER") {
          setError(res.error.message ?? "Your account has been blocked.");
          notify.error(id, "Account blocked", res.error.message);
          return;
        }
        setError(res.error.message ?? "Invalid ID/email or password.");
        notify.error(id, "Sign in failed", res.error.message);
        return;
      }
      notify.success(id, "Welcome back!");
      window.location.assign("/account");
    } catch (err) {
      const isRateLimited =
        err instanceof Error && err.message.toLowerCase().includes("too many");
      notify.error(
        id,
        isRateLimited ? "Too many attempts" : "Sign in failed",
        isRateLimited ? RATE_LIMIT_MESSAGE : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!verifyEmail) return;
    setVerifying(true);
    const id = notify.loading("Verifying your email…");
    try {
      const res = await fetch("/api/auth/email-otp/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyEmail, otp: code }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        if (res.status === 429) {
          notifyRateLimit(id, "Verification failed");
          return;
        }
        notify.error(id, "Verification failed", data.error ?? "Try again.");
        return;
      }
      notify.success(id, "Email verified!", "Welcome back to OUR:NARA.");
      window.location.assign("/account");
    } catch {
      notify.error(id, "Verification failed", "Something went wrong.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (!verifyEmail) return;
    setResending(true);
    const id = notify.loading("Sending a new code…");
    try {
      const res = await fetch("/api/auth/verify/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyEmail }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 429) {
        notifyRateLimit(id);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Could not send the code");
      notify.success(id, "Code sent", `Check ${verifyEmail}.`);
      setResendIn(60);
    } catch (err) {
      notify.error(
        id,
        "Could not send code",
        err instanceof Error ? err.message : "Try again.",
      );
    } finally {
      setResending(false);
    }
  }

  async function handleGoogle() {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/account",
    });
  }

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

          {verifyEmail ? (
            <form
              onSubmit={handleVerify}
              className="space-y-4 border border-[#e9e9e9] bg-white p-8 text-center"
            >
              <p className="text-sm text-[#666]">
                Please verify your email to continue. We sent a 6-digit code to{" "}
                <span className="font-semibold text-[#222]">{verifyEmail}</span>
                .
              </p>
              <input
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                required
                pattern="\d{6}"
                title="6-digit code"
                className="mx-auto block h-14 w-48 rounded border border-[#e9e9e9] text-center text-2xl tracking-[0.5em] text-[#222] outline-none focus:border-point-500 placeholder:text-zinc-300"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || resendIn > 0}
                  className="h-11 w-28 rounded border border-[#e9e9e9] text-sm font-semibold text-[#666] transition-colors hover:bg-zinc-50 disabled:opacity-60"
                >
                  {resending
                    ? "Sending…"
                    : resendIn > 0
                      ? `Resend in ${resendIn}s`
                      : "Resend code"}
                </button>
                <button
                  type="submit"
                  disabled={verifying || code.length !== 6}
                  className="h-11 flex-1 rounded bg-point-500 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
                >
                  {verifying ? "Verifying…" : "Verify Email"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setVerifyEmail(null)}
                className="text-xs text-[#888] hover:text-point-500"
              >
                ← Back to login
              </button>
            </form>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="space-y-4 border border-[#e9e9e9] bg-white p-8"
            >
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[#222]">
                  ID or Email
                </span>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  placeholder="your.id or you@email.com"
                  required
                  className="h-11 w-full rounded border border-[#e9e9e9] bg-white px-3 text-sm text-[#222] outline-none focus:border-point-500"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[#222]">
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                  className="h-11 w-full rounded border border-[#e9e9e9] bg-white px-3 text-sm text-[#222] outline-none focus:border-point-500"
                />
              </label>

              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="h-11 flex-1 rounded bg-point-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
                >
                  {loading ? "Signing in…" : "Sign In"}
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
          )}

          {!verifyEmail && (
            <div className="mt-4">
              <button
                type="button"
                onClick={handleGoogle}
                className="flex h-11 w-full items-center justify-center gap-2 rounded border border-[#e9e9e9] bg-white text-sm font-medium text-[#222] transition-colors hover:bg-zinc-50"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
                  />
                </svg>
                Continue with Google
              </button>
            </div>
          )}

          <div className="mt-4 text-center text-sm text-[#666]">
            New to OUR:NARA?{" "}
            <Link
              href="/join"
              className="font-semibold text-point-500 hover:underline"
            >
              Join
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
