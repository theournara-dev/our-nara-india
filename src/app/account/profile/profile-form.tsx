"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CountrySelect } from "@/components/ui/country-select";
import { PhoneCodeSelect } from "@/components/ui/phone-code-select";
import type { Country } from "@/data/countries";
import { notify } from "@/lib/toast";
import { updateProfile } from "./actions";

export type ProfileFields = {
  firstName: string;
  lastName: string;
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

const inputClass =
  "h-11 w-full rounded border border-[#e9e9e9] bg-white px-3 text-sm text-[#222] outline-none focus:border-point-500 placeholder:text-zinc-300";

export function ProfileForm({ initial }: { initial: ProfileFields }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof ProfileFields>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleCountryChange(country: Country | undefined) {
    if (!country) return;
    setForm((f) => ({
      ...f,
      country: country.code,
      telephoneCode: f.telephoneCode || country.phone,
      mobileCode: f.mobileCode || country.phone,
    }));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const res = await updateProfile(form);
      if (res.ok) {
        notify.success("Profile", "Your details were saved.");
        router.refresh();
      } else {
        notify.error("Profile", res.message);
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-2xl border border-zinc-100 bg-white p-6"
    >
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-zinc-900">Name</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">
              First name
            </span>
            <input
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              autoComplete="given-name"
              required
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">
              Last name
            </span>
            <input
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              autoComplete="family-name"
              required
              className={inputClass}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="space-y-4 border-t border-zinc-100 pt-5">
        <legend className="text-sm font-semibold text-zinc-900">Address</legend>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-zinc-700">
            Country
          </span>
          <CountrySelect value={form.country} onChange={handleCountryChange} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-zinc-700">
            Address line 1
          </span>
          <input
            value={form.addressLine1}
            onChange={(e) => set("addressLine1", e.target.value)}
            autoComplete="address-line1"
            required
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-zinc-700">
            Address line 2{" "}
            <span className="text-xs text-zinc-400">(optional)</span>
          </span>
          <input
            value={form.addressLine2}
            onChange={(e) => set("addressLine2", e.target.value)}
            autoComplete="address-line2"
            className={inputClass}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">
              City
            </span>
            <input
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              autoComplete="address-level2"
              required
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">
              State / Province{" "}
              <span className="text-xs text-zinc-400">(optional)</span>
            </span>
            <input
              value={form.state}
              onChange={(e) => set("state", e.target.value)}
              autoComplete="address-level1"
              className={inputClass}
            />
          </label>
        </div>
        <label className="block sm:max-w-xs">
          <span className="mb-1 block text-sm font-medium text-zinc-700">
            Postal code
          </span>
          <input
            value={form.postal}
            onChange={(e) => set("postal", e.target.value)}
            autoComplete="postal-code"
            required
            className={inputClass}
          />
        </label>
      </fieldset>

      <fieldset className="space-y-4 border-t border-zinc-100 pt-5">
        <legend className="text-sm font-semibold text-zinc-900">Contact</legend>
        <div className="grid grid-cols-[110px_1fr] gap-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">
              Code
            </span>
            <PhoneCodeSelect
              value={form.telephoneCode}
              onChange={(code) => set("telephoneCode", code)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">
              Telephone
            </span>
            <input
              type="tel"
              value={form.telephone}
              onChange={(e) => set("telephone", e.target.value)}
              autoComplete="tel"
              className={inputClass}
            />
          </label>
        </div>
        <div className="grid grid-cols-[110px_1fr] gap-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">
              Code
            </span>
            <PhoneCodeSelect
              value={form.mobileCode}
              onChange={(code) => set("mobileCode", code)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-zinc-700">
              Mobile
            </span>
            <input
              type="tel"
              value={form.mobile}
              onChange={(e) => set("mobile", e.target.value)}
              autoComplete="tel-mobile"
              className={inputClass}
            />
          </label>
        </div>
      </fieldset>

      <div className="flex justify-end border-t border-zinc-100 pt-5">
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded bg-point-500 px-6 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save details"}
        </button>
      </div>
    </form>
  );
}
