"use client";

import { useEffect, useState } from "react";
import {
  submitAmbassadorApplication,
  type AmbassadorApplicationInput,
} from "@/app/actions/ambassador";
import { Button } from "@/components/ui/button";
import { CountrySelect } from "@/components/ui/country-select";
import { PhoneCodeSelect } from "@/components/ui/phone-code-select";
import { notify } from "@/lib/toast";

/**
 * CTA + application modal for /ambassador. Mirrors the server's required
 * fields (see actions/ambassador.ts) so mistakes surface before the round
 * trip, then shows an in-dialog thank-you state instead of the form.
 */

const EMAIL_RE = /^\S+@\S+\.\S+$/;

const inputCls = (hasError: boolean) =>
  `h-11 w-full rounded border bg-white px-3 text-sm text-[#222] outline-none placeholder:text-zinc-300 ${
    hasError
      ? "border-rose-400 focus:border-rose-500"
      : "border-zinc-200 focus:border-point-500"
  }`;
const labelCls = "mb-1 block text-xs font-medium text-zinc-500";
const errorCls = "mt-1 block text-xs text-rose-600";

type FormState = {
  name: string;
  email: string;
  phoneCode: string;
  phone: string;
  country: string;
  city: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  blog: string;
  followers: string;
  audience: string;
  motivation: string;
  experience: string;
};

const emptyForm: FormState = {
  name: "",
  email: "",
  phoneCode: "+91",
  phone: "",
  country: "",
  city: "",
  instagram: "",
  tiktok: "",
  youtube: "",
  blog: "",
  followers: "",
  audience: "",
  motivation: "",
  experience: "",
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  if (form.name.trim().length < 2) errors.name = "Please enter your full name.";
  if (!EMAIL_RE.test(form.email.trim()))
    errors.email = "Enter a valid email address.";
  if (form.phone.trim().length < 6)
    errors.phone = "Please add a phone number.";
  if (!form.country.trim()) errors.country = "Please select your country.";
  if (
    ![form.instagram, form.tiktok, form.youtube, form.blog].some((s) => s.trim())
  )
    errors.instagram = "Add at least one social profile or link.";
  if (!form.followers.trim())
    errors.followers = "Tell us roughly how many followers you have.";
  if (form.audience.trim().length < 2)
    errors.audience = "Tell us about your audience or niche.";
  if (form.motivation.trim().length < 30)
    errors.motivation =
      "Tell us a little more about why you want to join (at least 30 characters).";
  return errors;
}

export function AmbassadorApplyButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        Apply to become an ambassador
      </Button>
      {open && <AmbassadorApplyDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function AmbassadorApplyDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Pre-fill name/email for signed-in users, best effort.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/get-session")
      .then((r) => (r.ok ? r.json() : null))
      .then((session: { user?: { name?: string; email?: string } } | null) => {
        if (cancelled || !session?.user) return;
        setForm((f) => ({
          ...f,
          name: f.name || session.user!.name || "",
          email: f.email || session.user!.email || "",
        }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Close on Escape, matching the other storefront dialogs. Blocked while
  // sending so a stray keypress can't abandon an in-flight submission.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !sending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, sending]);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setSending(true);
    const tid = notify.loading("Sending application…");
    try {
      const input: AmbassadorApplicationInput = {
        name: form.name,
        email: form.email,
        phone: [form.phoneCode, form.phone].filter(Boolean).join(" ").trim(),
        country: form.country,
        city: form.city,
        instagram: form.instagram,
        tiktok: form.tiktok,
        youtube: form.youtube,
        blog: form.blog,
        followers: form.followers,
        audience: form.audience,
        motivation: form.motivation,
        experience: form.experience,
      };
      const res = await submitAmbassadorApplication(input);
      if (!res.ok) {
        setFormError(res.error);
        notify.error(tid, "Could not send", res.error);
        return;
      }
      setSent(true);
      notify.success(tid, "Application sent", "We'll get back to you by email.");
    } catch {
      setFormError("Could not send your application. Please try again.");
      notify.error(tid, "Could not send", "Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-zinc-900/50 backdrop-blur-sm"
        onClick={sending ? undefined : onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Apply to become an ambassador"
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={sending}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-60"
        >
          ✕
        </button>

        {sent ? (
          <div className="py-12 text-center">
            <p className="text-lg font-semibold text-zinc-900">
              Thanks for applying!
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500">
              We&apos;ve received your application and will get back to you at{" "}
              <span className="font-medium text-zinc-700">{form.email}</span>{" "}
              within a few days.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 h-10 rounded-full bg-point-500 px-6 text-sm font-semibold text-white transition-colors hover:bg-point-600"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <h3 className="pr-8 text-lg font-semibold text-zinc-900">
              Apply to become an OUR:NARA ambassador
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Tell us about yourself and your channels. We review every
              application and reply by email. Fields marked{" "}
              <span className="text-point-500">*</span> are required.
            </p>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="mt-4 flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    About you
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className={labelCls}>
                        Full name <span className="text-point-500">*</span>
                      </span>
                      <input
                        value={form.name}
                        onChange={(e) => set("name", e.target.value)}
                        placeholder="Priya Sharma"
                        autoComplete="name"
                        maxLength={120}
                        className={inputCls(!!errors.name)}
                      />
                      {errors.name && (
                        <span className={errorCls}>{errors.name}</span>
                      )}
                    </label>
                    <label className="block">
                      <span className={labelCls}>
                        Email <span className="text-point-500">*</span>
                      </span>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        placeholder="you@email.com"
                        autoComplete="email"
                        maxLength={200}
                        className={inputCls(!!errors.email)}
                      />
                      {errors.email && (
                        <span className={errorCls}>{errors.email}</span>
                      )}
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <span className={labelCls}>
                        Phone <span className="text-point-500">*</span>
                      </span>
                      <div className="flex gap-2">
                        <PhoneCodeSelect
                          value={form.phoneCode}
                          onChange={(code) => set("phoneCode", code)}
                          className="w-28 shrink-0"
                        />
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(e) => set("phone", e.target.value)}
                          placeholder="98765 43210"
                          autoComplete="tel"
                          maxLength={20}
                          className={inputCls(!!errors.phone)}
                        />
                      </div>
                      {errors.phone && (
                        <span className={errorCls}>{errors.phone}</span>
                      )}
                    </div>
                    <div>
                      <span className={labelCls}>
                        Country <span className="text-point-500">*</span>
                      </span>
                      <CountrySelect
                        value={form.country}
                        onChange={(c) => set("country", c?.name ?? "")}
                      />
                      {errors.country && (
                        <span className={errorCls}>{errors.country}</span>
                      )}
                    </div>
                  </div>
                  <label className="block">
                    <span className={labelCls}>City</span>
                    <input
                      value={form.city}
                      onChange={(e) => set("city", e.target.value)}
                      placeholder="Mumbai"
                      autoComplete="address-level2"
                      maxLength={80}
                      className={inputCls(false)}
                    />
                  </label>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Your channels
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className={labelCls}>Instagram</span>
                      <input
                        value={form.instagram}
                        onChange={(e) => set("instagram", e.target.value)}
                        placeholder="@yourhandle or profile URL"
                        maxLength={200}
                        className={inputCls(!!errors.instagram)}
                      />
                      {errors.instagram && (
                        <span className={errorCls}>{errors.instagram}</span>
                      )}
                    </label>
                    <label className="block">
                      <span className={labelCls}>TikTok</span>
                      <input
                        value={form.tiktok}
                        onChange={(e) => set("tiktok", e.target.value)}
                        placeholder="@yourhandle or profile URL"
                        maxLength={200}
                        className={inputCls(false)}
                      />
                    </label>
                    <label className="block">
                      <span className={labelCls}>YouTube</span>
                      <input
                        value={form.youtube}
                        onChange={(e) => set("youtube", e.target.value)}
                        placeholder="Channel URL or @handle"
                        maxLength={200}
                        className={inputCls(false)}
                      />
                    </label>
                    <label className="block">
                      <span className={labelCls}>Blog / portfolio</span>
                      <input
                        value={form.blog}
                        onChange={(e) => set("blog", e.target.value)}
                        placeholder="https://…"
                        maxLength={200}
                        className={inputCls(false)}
                      />
                    </label>
                    <label className="block">
                      <span className={labelCls}>
                        Followers <span className="text-point-500">*</span>
                      </span>
                      <input
                        value={form.followers}
                        onChange={(e) => set("followers", e.target.value)}
                        placeholder="e.g. 12,500 across platforms"
                        maxLength={60}
                        className={inputCls(!!errors.followers)}
                      />
                      {errors.followers && (
                        <span className={errorCls}>{errors.followers}</span>
                      )}
                    </label>
                    <label className="block">
                      <span className={labelCls}>
                        Audience / niche{" "}
                        <span className="text-point-500">*</span>
                      </span>
                      <input
                        value={form.audience}
                        onChange={(e) => set("audience", e.target.value)}
                        placeholder="e.g. Skincare and makeup, ages 18–30"
                        maxLength={200}
                        className={inputCls(!!errors.audience)}
                      />
                      {errors.audience && (
                        <span className={errorCls}>{errors.audience}</span>
                      )}
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Why you
                  </p>
                  <label className="block">
                    <span className={labelCls}>
                      Why do you want to join?{" "}
                      <span className="text-point-500">*</span>
                    </span>
                    <textarea
                      value={form.motivation}
                      onChange={(e) => set("motivation", e.target.value)}
                      rows={4}
                      maxLength={2000}
                      placeholder="What do you love about K-beauty, and what would you do as an OUR:NARA ambassador?"
                      className={`${inputCls(!!errors.motivation)} h-auto py-2`}
                    />
                    {errors.motivation && (
                      <span className={errorCls}>{errors.motivation}</span>
                    )}
                  </label>
                  <label className="block">
                    <span className={labelCls}>Relevant experience</span>
                    <textarea
                      value={form.experience}
                      onChange={(e) => set("experience", e.target.value)}
                      rows={3}
                      maxLength={2000}
                      placeholder="Past brand collabs, campaigns or content you're proud of (optional)"
                      className={`${inputCls(false)} h-auto py-2`}
                    />
                  </label>
                </div>
              </div>

              {formError && (
                <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {formError}
                </p>
              )}

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={sending}
                  className="h-10 rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="h-10 flex-1 rounded-full bg-point-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
                >
                  {sending ? "Sending…" : "Submit application"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
