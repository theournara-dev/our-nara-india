"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/container";
import { CountrySelect } from "@/components/ui/country-select";
import { PhoneCodeSelect } from "@/components/ui/phone-code-select";
import { StepIndicator } from "@/components/ui/step-indicator";
import type { Country } from "@/data/countries";
import { authClient } from "@/lib/auth-client";
import { EMAIL_VERIFICATION_ENABLED } from "@/lib/config";
import { isRateLimit, notifyRateLimit } from "@/lib/errors";
import { notify } from "@/lib/toast";

const inputClass =
  "h-11 w-full rounded border border-[#e9e9e9] bg-white px-3 text-sm text-[#222] outline-none focus:border-point-500 placeholder:text-zinc-300";

const steps = EMAIL_VERIFICATION_ENABLED
  ? [
      { label: "Policies" },
      { label: "Create Profile" },
      { label: "Verify Email" },
    ]
  : [{ label: "Policies" }, { label: "Create Profile" }];

type FormState = {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postal: string;
  telephoneCode: string;
  telephone: string;
  mobileCode: string;
  mobile: string;
};

const emptyForm: FormState = {
  username: "",
  password: "",
  firstName: "",
  lastName: "",
  email: "",
  country: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postal: "",
  telephoneCode: "",
  telephone: "",
  mobileCode: "",
  mobile: "",
};

/** Join wizard mirroring the original member join: 1) Policies, 2) Create
 *  Profile, 3) Verify Email (link sent to the address). */
export default function JoinPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(false);

  // Already signed in? Send them to their account.
  useEffect(() => {
    if (!isPending && session) router.replace("/account");
  }, [session, isPending, router]);

  // Step 1 — terms
  const [agreeAll, setAgreeAll] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [optSms, setOptSms] = useState(false);
  const [optEmail, setOptEmail] = useState(false);

  // Step 3 — wait for the emailed link
  const [resending, setResending] = useState(false);
  const [resendIn, setResendIn] = useState(0); // seconds until resend allowed

  // Count down the resend cooldown.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleCountryChange(country: Country | undefined) {
    if (!country) return;
    setForm((f) => ({
      ...f,
      country: country.code,
      telephoneCode: country.phone,
      mobileCode: country.phone,
    }));
  }

  function toggleAgreeAll() {
    const next = !agreeAll;
    setAgreeAll(next);
    setAgreeTerms(next);
    setAgreePrivacy(next);
    setOptSms(next);
    setOptEmail(next);
  }

  const requiredAgreed = agreeTerms && agreePrivacy;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const id = notify.loading("Creating your account…");
    try {
      const res = await authClient.signUp.email({
        email: form.email,
        password: form.password,
        name: `${form.firstName} ${form.lastName}`.trim(),
        username: form.username,
        callbackURL: `${window.location.origin}/verify-email`,
        firstName: form.firstName,
        lastName: form.lastName,
        country: form.country,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2 || undefined,
        city: form.city,
        state: form.state,
        postal: form.postal,
        telephoneCode: form.telephoneCode,
        telephone: form.telephone,
        mobileCode: form.mobileCode,
        mobile: form.mobile,
      });
      if (res.error) {
        if (isRateLimit(res.error)) {
          notifyRateLimit(id);
          return;
        }
        notify.error(id, "Sign up failed", res.error.message);
        return;
      }
      if (EMAIL_VERIFICATION_ENABLED) {
        notify.success(
          id,
          "Account created!",
          "Check your email for the verification link.",
        );
        setStep(3);
      } else {
        notify.success(id, "Welcome to OUR:NARA!");
        // Full page navigation so the freshly-set session cookie is committed
        // before the browser loads /account (client-side push can race the
        // cookie write and land on /login).
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- deliberate full reload
        window.location.assign("/account");
      }
    } catch (err) {
      notify.error(
        id,
        "Sign up failed",
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    const id = notify.loading("Sending a new link…");
    try {
      const res = await authClient.sendVerificationEmail({
        email: form.email,
        callbackURL: `${window.location.origin}/verify-email`,
      });
      if (res.error) {
        if (isRateLimit(res.error)) {
          notifyRateLimit(id);
          return;
        }
        notify.error(id, "Could not send the link", res.error.message);
        return;
      }
      notify.success(id, "Link sent", `Check ${form.email}.`);
      setResendIn(60);
    } catch (err) {
      notify.error(
        id,
        "Could not send the link",
        err instanceof Error ? err.message : "Try again.",
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <div>
      <Container className="py-12">
        <div className="mx-auto max-w-lg">
          <h1 className="mb-1 text-center font-category text-3xl font-semibold text-ink">
            Join
          </h1>
          <p className="mb-8 text-center text-sm text-[#888]">
            Sign up to track orders, save wishlists and collect mileage.
          </p>

          <StepIndicator steps={steps} current={step} />

          {step === 1 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStep(2);
              }}
              className="space-y-4 border border-[#e9e9e9] bg-white p-8"
            >
              <label className="flex cursor-pointer items-center gap-3 border-b border-[#e9e9e9] pb-4">
                <input
                  type="checkbox"
                  checked={agreeAll}
                  onChange={toggleAgreeAll}
                  className="h-4 w-4 accent-point-500"
                />
                <span className="text-sm font-semibold text-[#222]">
                  Agree to all
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => {
                    setAgreeTerms(e.target.checked);
                    setAgreeAll(
                      e.target.checked && agreePrivacy && optSms && optEmail,
                    );
                  }}
                  className="mt-0.5 h-4 w-4 accent-point-500"
                />
                <span className="text-sm text-[#444]">
                  I agree to the{" "}
                  <Link
                    href="/policies/terms"
                    target="_blank"
                    className="font-medium text-point-500 underline"
                  >
                    Terms of Use
                  </Link>{" "}
                  <span className="text-xs text-[#999]">(required)</span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={agreePrivacy}
                  onChange={(e) => {
                    setAgreePrivacy(e.target.checked);
                    setAgreeAll(
                      e.target.checked && agreeTerms && optSms && optEmail,
                    );
                  }}
                  className="mt-0.5 h-4 w-4 accent-point-500"
                />
                <span className="text-sm text-[#444]">
                  I agree to the{" "}
                  <Link
                    href="/policies/privacy"
                    target="_blank"
                    className="font-medium text-point-500 underline"
                  >
                    Privacy Policy
                  </Link>{" "}
                  <span className="text-xs text-[#999]">(required)</span>
                </span>
              </label>

              <div className="space-y-2 border-t border-[#e9e9e9] pt-4">
                <p className="text-xs text-[#999]">
                  Optional — we only email or text about your orders and
                  exclusive offers.
                </p>
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={optSms}
                    onChange={(e) => {
                      setOptSms(e.target.checked);
                      setAgreeAll(
                        e.target.checked &&
                          agreeTerms &&
                          agreePrivacy &&
                          optEmail,
                      );
                    }}
                    className="h-4 w-4 accent-point-500"
                  />
                  <span className="text-sm text-[#444]">SMS notifications</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={optEmail}
                    onChange={(e) => {
                      setOptEmail(e.target.checked);
                      setAgreeAll(
                        e.target.checked &&
                          agreeTerms &&
                          agreePrivacy &&
                          optSms,
                      );
                    }}
                    className="h-4 w-4 accent-point-500"
                  />
                  <span className="text-sm text-[#444]">Email newsletters</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={!requiredAgreed}
                className="h-11 w-full rounded bg-point-500 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-50"
              >
                Continue
              </button>
            </form>
          )}

          {step === 2 && (
            <form
              onSubmit={handleSubmit}
              className="space-y-4 border border-[#e9e9e9] bg-white p-8"
            >
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[#222]">
                  ID{" "}
                  <span className="text-xs text-[#999]">
                    (lowercase letters &amp; numbers, 4–16)
                  </span>
                </span>
                <input
                  value={form.username}
                  onChange={(e) => set("username", e.target.value)}
                  autoComplete="username"
                  placeholder="e.g. jane123"
                  required
                  pattern="[a-z0-9]{4,16}"
                  title="4–16 lowercase letters and numbers"
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[#222]">
                  Password
                </span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                  className={inputClass}
                />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-[#222]">
                    First Name
                  </span>
                  <input
                    value={form.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                    autoComplete="given-name"
                    placeholder="Jane"
                    required
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-[#222]">
                    Last Name
                  </span>
                  <input
                    value={form.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                    autoComplete="family-name"
                    placeholder="Doe"
                    required
                    className={inputClass}
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[#222]">
                  Email
                </span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  autoComplete="email"
                  placeholder="you@email.com"
                  required
                  className={inputClass}
                />
              </label>

              <fieldset className="space-y-3 border-t border-[#e9e9e9] pt-4">
                <legend className="text-sm font-medium text-[#222]">
                  Address
                </legend>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-[#222]">
                    Country
                  </span>
                  <CountrySelect
                    value={form.country}
                    onChange={handleCountryChange}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-[#222]">
                    Address Line 1
                  </span>
                  <input
                    value={form.addressLine1}
                    onChange={(e) => set("addressLine1", e.target.value)}
                    autoComplete="address-line1"
                    placeholder="Flat, building, street"
                    required
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-[#222]">
                    Address Line 2{" "}
                    <span className="text-xs text-[#999]">(optional)</span>
                  </span>
                  <input
                    value={form.addressLine2}
                    onChange={(e) => set("addressLine2", e.target.value)}
                    autoComplete="address-line2"
                    placeholder="Apartment, suite, unit"
                    className={inputClass}
                  />
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-[#222]">
                      City
                    </span>
                    <input
                      value={form.city}
                      onChange={(e) => set("city", e.target.value)}
                      autoComplete="address-level2"
                      placeholder="e.g. Mumbai"
                      required
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-[#222]">
                      State / Province
                    </span>
                    <input
                      value={form.state}
                      onChange={(e) => set("state", e.target.value)}
                      autoComplete="address-level1"
                      placeholder="e.g. Maharashtra"
                      className={inputClass}
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-[#222]">
                    Zip / Postal Code
                  </span>
                  <input
                    value={form.postal}
                    onChange={(e) => set("postal", e.target.value)}
                    autoComplete="postal-code"
                    placeholder="e.g. 400001"
                    required
                    className={inputClass}
                  />
                </label>
              </fieldset>

              <fieldset className="space-y-4 border-t border-[#e9e9e9] pt-4">
                <legend className="text-sm font-medium text-[#222]">
                  Contact
                </legend>
                <div className="grid grid-cols-[110px_1fr] gap-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-[#222]">
                      Code
                    </span>
                    <PhoneCodeSelect
                      value={form.telephoneCode}
                      onChange={(code) => set("telephoneCode", code)}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-[#222]">
                      Telephone
                    </span>
                    <input
                      type="tel"
                      value={form.telephone}
                      onChange={(e) => set("telephone", e.target.value)}
                      autoComplete="tel"
                      placeholder="12345 67890"
                      className={inputClass}
                    />
                  </label>
                </div>
                <div className="grid grid-cols-[110px_1fr] gap-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-[#222]">
                      Code
                    </span>
                    <PhoneCodeSelect
                      value={form.mobileCode}
                      onChange={(code) => set("mobileCode", code)}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-[#222]">
                      Mobile
                    </span>
                    <input
                      type="tel"
                      value={form.mobile}
                      onChange={(e) => set("mobile", e.target.value)}
                      autoComplete="tel-mobile"
                      placeholder="98765 43210"
                      className={inputClass}
                    />
                  </label>
                </div>
              </fieldset>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="h-11 w-28 rounded border border-[#e9e9e9] text-sm font-semibold text-[#666] transition-colors hover:bg-zinc-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="h-11 flex-1 rounded bg-point-500 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
                >
                  {loading ? "Creating account…" : "Create Account"}
                </button>
              </div>
            </form>
          )}

          {EMAIL_VERIFICATION_ENABLED && step === 3 && (
            <div className="space-y-4 border border-[#e9e9e9] bg-white p-8 text-center">
              <p className="text-sm text-[#666]">
                We sent a verification link to{" "}
                <span className="font-semibold text-[#222]">{form.email}</span>
                . Open it to verify your email and finish setting up your
                account.
              </p>
              <p className="text-xs text-[#888]">
                The link expires in 1 hour. Check your spam folder if it
                doesn&apos;t arrive.
              </p>
              <p className="text-xs text-[#888]">
                Already had an account? Nothing new was created —{" "}
                <Link href="/login" className="font-medium text-point-500 underline">
                  sign in
                </Link>{" "}
                or{" "}
                <Link
                  href="/forgot-password"
                  className="font-medium text-point-500 underline"
                >
                  reset your password
                </Link>
                .
              </p>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || resendIn > 0}
                className="h-11 w-full rounded bg-point-500 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
              >
                {resending
                  ? "Sending…"
                  : resendIn > 0
                    ? `Resend link in ${resendIn}s`
                    : "Resend verification link"}
              </button>
            </div>
          )}

          <div className="mt-4 text-center text-sm text-[#666]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-point-500 hover:underline"
            >
              Login
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
