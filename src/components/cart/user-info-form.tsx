"use client";

import { useCallback, useMemo, useState } from "react";
import { authClient } from "@/lib/auth-client";

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

export const EMPTY_USER_INFO: UserInfoValues = {
  name: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postal: "",
  country: "IN",
};

type SessionUser = {
  name?: string | null;
  email?: string | null;
  telephone?: string | null;
  mobile?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postal?: string | null;
  country?: string | null;
} | null;

function valuesFromUser(user: SessionUser): UserInfoValues {
  return {
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.telephone ?? user?.mobile ?? "",
    addressLine1: user?.addressLine1 ?? "",
    addressLine2: user?.addressLine2 ?? "",
    city: user?.city ?? "",
    state: user?.state ?? "",
    postal: user?.postal ?? "",
    country: user?.country ?? "IN",
  };
}

/**
 * Contact + shipping values owned by the parent. Session fields act as the
 * base and the user's edits as overrides, so the caller always has complete,
 * current values — prefilled sign-in details count as valid immediately,
 * with no "has the user filled this in yet" flag to forget.
 */
export function useUserInfo(): {
  values: UserInfoValues;
  setValues: (next: UserInfoValues) => void;
} {
  const { data: session } = authClient.useSession();
  const base = useMemo(
    () => valuesFromUser(session?.user as SessionUser),
    [session],
  );
  const [overrides, setOverrides] = useState<Partial<UserInfoValues> | null>(
    null,
  );
  const values = useMemo(
    () => (overrides ? { ...base, ...overrides } : base),
    [base, overrides],
  );
  const setValues = useCallback((next: UserInfoValues) => {
    setOverrides(next);
  }, []);
  return { values, setValues };
}

/**
 * Controlled contact + shipping address form shared by the quick-purchase
 * sheet and the cart page. All state lives in the parent (via `useUserInfo`),
 * so the form is a pure view of `values` that reports edits through `onChange`.
 */
export function UserInfoForm({
  values,
  onChange,
}: {
  values: UserInfoValues;
  onChange: (values: UserInfoValues) => void;
}) {
  function update<K extends keyof UserInfoValues>(key: K, value: string) {
    onChange({ ...values, [key]: value });
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
