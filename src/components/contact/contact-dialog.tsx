"use client";

import { useEffect, useState } from "react";
import { submitFeedback } from "@/app/actions/feedback";
import { notify } from "@/lib/toast";

/**
 * "Contact us" dialog: collects an email (pre-filled for signed-in users), a
 * message, and — when opened from an error — sends along the error trace so
 * support can reproduce the issue.
 */
export function ContactDialog({
  open,
  onClose,
  error,
}: {
  open: boolean;
  onClose: () => void;
  /** Error context to attach when opened from an error state. */
  error?: { name?: string; message?: string; digest?: string } | null;
}) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Pre-fill email from the session when the dialog opens.
  useEffect(() => {
    if (!open || email) return;
    let cancelled = false;
    fetch("/api/auth/get-session")
      .then((r) => (r.ok ? r.json() : null))
      .then((session: { user?: { email?: string } } | null) => {
        if (!cancelled && session?.user?.email) {
          setEmail((current) => current || session.user!.email!);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, email]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function close() {
    onClose();
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    const id = notify.loading("Sending…");
    try {
      const url = typeof window !== "undefined" ? window.location.href : "";
      const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
      const res = await submitFeedback({
        email,
        message,
        error: error
          ? { ...error, url, userAgent }
          : { url, userAgent },
      });
      if (!res.ok) {
        notify.error(id, "Could not send", res.error);
        return;
      }
      setSent(true);
      notify.success(id, "Message sent", "We'll get back to you soon.");
      setTimeout(close, 1500);
    } catch {
      notify.error(id, "Could not send", "Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm"
            onClick={sending ? undefined : close}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Contact us"
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={close}
              disabled={sending}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            >
              ✕
            </button>

            <h3 className="text-lg font-semibold text-zinc-900">Contact us</h3>
            <p className="mt-1 text-sm text-zinc-500">
              {error
                ? "Something went wrong. Tell us what happened and we'll help you out."
                : "Questions, feedback or issues — we're happy to help."}
            </p>

            {error && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Error details will be attached automatically
                {error.digest ? ` (ref: ${error.digest})` : ""}.
              </p>
            )}

            {sent ? (
              <div className="py-8 text-center">
                <p className="text-sm font-medium text-zinc-900">
                  Message sent!
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  We&apos;ll reply to {email}.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSend} className="mt-4 space-y-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-zinc-700">
                    Email
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    required
                    className="h-10 w-full rounded border border-zinc-200 px-3 text-sm text-zinc-900 outline-none focus:border-point-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-zinc-700">
                    Message
                  </span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      error
                        ? "Describe what you were doing when the error occurred…"
                        : "How can we help?"
                    }
                    rows={4}
                    required
                    minLength={5}
                    maxLength={5000}
                    className="w-full rounded border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-point-500"
                  />
                </label>
                <button
                  type="submit"
                  disabled={sending}
                  className="h-10 w-full rounded bg-point-500 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
                >
                  {sending ? "Sending…" : "Send"}
                </button>
              </form>
            )}
          </div>
        </div>
  );
}

/** Imperatively open the global contact dialog (optionally with an error). */
export function openContactDialog(
  error?: { name?: string; message?: string; digest?: string } | null,
) {
  window.dispatchEvent(
    new CustomEvent("contact-us:open", { detail: error ?? null }),
  );
}

/**
 * Mount once in the root layout. Renders nothing until the dialog opens, and
 * listens for `contact-us:open` events so any component (error boundaries,
 * toast error actions, header/footer links) can open it.
 */
export function ContactDialogHost() {
  const [mount, setMount] = useState(false);
  const [error, setError] = useState<{
    name?: string;
    message?: string;
    digest?: string;
  } | null>(null);

  useEffect(() => {
    function onOpen(e: Event) {
      setError(
        e instanceof CustomEvent
          ? ((e.detail as {
              name?: string;
              message?: string;
              digest?: string;
            } | null) ?? null)
          : null,
      );
      setMount(true);
    }
    window.addEventListener("contact-us:open", onOpen);
    return () => window.removeEventListener("contact-us:open", onOpen);
  }, []);

  return (
    <ContactDialogShim mount={mount} error={error} onClose={() => setMount(false)} />
  );
}

function ContactDialogShim({
  mount,
  error,
  onClose,
}: {
  mount: boolean;
  error: { name?: string; message?: string; digest?: string } | null;
  onClose: () => void;
}) {
  return mount ? <ContactDialog open error={error} onClose={onClose} /> : null;
}