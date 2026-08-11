"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

/**
 * Contact + shipping address form shared by the quick-purchase sheet and the
 * cart page. Fields are prefilled from the signed-in account when available and
 * editable so a guest (or a user checking out to a different address) can fill
 * them in. Values are surfaced to the parent via `onChange` so the caller can
 * read them when placing an order.
 */
export function UserInfoForm({
  onChange,
}: {
  onChange?: (values: UserInfoValues) => void;
}) {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const [values, setValues] = useState<UserInfoValues>(() => ({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.telephone ?? user?.mobile ?? "",
    addressLine1: user?.addressLine1 ?? "",
    addressLine2: user?.addressLine2 ?? "",
    city: user?.city ?? "",
    state: user?.state ?? "",
    postal: user?.postal ?? "",
    country: user?.country ?? "IN",
  }));

  // Prefill once the session resolves after mount.
  const [prevUser, setPrevUser] = useState(user);
  if (prevUser !== user) {
    setPrevUser(user);
    if (user) {
      setValues({
        name: user.name ?? "",
        email: user.email ?? "",
        phone: user.telephone ?? user.mobile ?? "",
        addressLine1: user.addressLine1 ?? "",
        addressLine2: user.addressLine2 ?? "",
        city: user.city ?? "",
        state: user.state ?? "",
        postal: user.postal ?? "",
        country: user.country ?? "IN",
      });
    }
  }

  function update<K extends keyof UserInfoValues>(key: K, value: string) {
    const next = { ...values, [key]: value };
    setValues(next);
    onChange?.(next);
  }

  const inputCls =
    "h-10 w-full rounded border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:border-point-500";
  const labelCls = "mb-1 block text-xs font-medium text-zinc-500";

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Name</span>
          <input
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            required
            autoComplete="name"
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className={labelCls}>Phone</span>
          <input
            type="tel"
            value={values.phone}
            onChange={(e) => update("phone", e.target.value)}
            autoComplete="tel"
            className={inputCls}
          />
        </label>
      </div>
      <label className="block">
        <span className={labelCls}>Email</span>
        <input
          type="email"
          value={values.email}
          onChange={(e) => update("email", e.target.value)}
          required
          autoComplete="email"
          className={inputCls}
        />
      </label>

      <div className="pt-1">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Shipping address
        </p>
        <div className="space-y-3">
          <label className="block">
            <span className={labelCls}>Address line 1</span>
            <input
              value={values.addressLine1}
              onChange={(e) => update("addressLine1", e.target.value)}
              required
              autoComplete="address-line1"
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Address line 2 (optional)</span>
            <input
              value={values.addressLine2}
              onChange={(e) => update("addressLine2", e.target.value)}
              autoComplete="address-line2"
              className={inputCls}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>City</span>
              <input
                value={values.city}
                onChange={(e) => update("city", e.target.value)}
                required
                autoComplete="address-level2"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>State</span>
              <input
                value={values.state}
                onChange={(e) => update("state", e.target.value)}
                autoComplete="address-level1"
                className={inputCls}
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Postal code</span>
              <input
                value={values.postal}
                onChange={(e) => update("postal", e.target.value)}
                required
                autoComplete="postal-code"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Country</span>
              <input
                value={values.country}
                onChange={(e) => update("country", e.target.value)}
                required
                autoComplete="country"
                className={inputCls}
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export type UserInfoValues = {
  name: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postal: string;
  country: string;
};
