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

/** Field-level validation messages for [UserInfoForm], keyed by field. */
export type UserInfoErrors = Partial<Record<keyof UserInfoValues, string>>;

const EMAIL_RE = /^\S+@\S+\.\S+$/;

/**
 * Client-side mirror of the server's required fields (see actions/orders.ts).
 * The inputs aren't inside a <form>, so native `required` never fires — this
 * is the real check, and it powers both the input highlights and the toast
 * copy that names exactly what's missing.
 */
export function validateUserInfo(values: UserInfoValues): UserInfoErrors {
  const errors: UserInfoErrors = {};
  if (!values.name.trim()) errors.name = "Name is required";
  if (!values.email.trim()) errors.email = "Email is required";
  else if (!EMAIL_RE.test(values.email.trim()))
    errors.email = "Enter a valid email address";
  if (!values.phone.trim()) errors.phone = "Phone is required";
  if (!values.addressLine1.trim())
    errors.addressLine1 = "Address line 1 is required";
  if (!values.city.trim()) errors.city = "City is required";
  if (!values.postal.trim()) errors.postal = "Postal code is required";
  if (!values.country.trim()) errors.country = "Country is required";
  return errors;
}

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
  errors,
}: {
  values: UserInfoValues;
  onChange: (values: UserInfoValues) => void;
  /** Field-level messages; flagged inputs get a red border + inline message. */
  errors?: UserInfoErrors;
}) {
  function update<K extends keyof UserInfoValues>(key: K, value: string) {
    onChange({ ...values, [key]: value });
  }

  const inputCls = (hasError: boolean) =>
    `h-10 w-full rounded border bg-white px-3 text-sm text-zinc-900 outline-none ${
      hasError
        ? "border-rose-400 focus:border-rose-500"
        : "border-zinc-200 focus:border-point-500"
    }`;
  const labelCls = "mb-1 block text-xs font-medium text-zinc-500";
  const errorCls = "mt-1 block text-xs text-rose-600";

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
            className={inputCls(!!errors?.name)}
          />
          {errors?.name ? (
            <span className={errorCls}>{errors.name}</span>
          ) : null}
        </label>
        <label className="block">
          <span className={labelCls}>Phone</span>
          <input
            type="tel"
            value={values.phone}
            onChange={(e) => update("phone", e.target.value)}
            autoComplete="tel"
            className={inputCls(!!errors?.phone)}
          />
          {errors?.phone ? (
            <span className={errorCls}>{errors.phone}</span>
          ) : null}
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
          className={inputCls(!!errors?.email)}
        />
        {errors?.email ? (
          <span className={errorCls}>{errors.email}</span>
        ) : null}
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
              className={inputCls(!!errors?.addressLine1)}
            />
            {errors?.addressLine1 ? (
              <span className={errorCls}>{errors.addressLine1}</span>
            ) : null}
          </label>
          <label className="block">
            <span className={labelCls}>Address line 2 (optional)</span>
            <input
              value={values.addressLine2}
              onChange={(e) => update("addressLine2", e.target.value)}
              autoComplete="address-line2"
              className={inputCls(false)}
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
                className={inputCls(!!errors?.city)}
              />
              {errors?.city ? (
                <span className={errorCls}>{errors.city}</span>
              ) : null}
            </label>
            <label className="block">
              <span className={labelCls}>State</span>
              <input
                value={values.state}
                onChange={(e) => update("state", e.target.value)}
                autoComplete="address-level1"
                className={inputCls(false)}
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
                className={inputCls(!!errors?.postal)}
              />
              {errors?.postal ? (
                <span className={errorCls}>{errors.postal}</span>
              ) : null}
            </label>
            <label className="block">
              <span className={labelCls}>Country</span>
              <input
                value={values.country}
                onChange={(e) => update("country", e.target.value)}
                required
                autoComplete="country"
                className={inputCls(!!errors?.country)}
              />
              {errors?.country ? (
                <span className={errorCls}>{errors.country}</span>
              ) : null}
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
