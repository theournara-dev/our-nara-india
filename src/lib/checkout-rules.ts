/**
 * Checkout rules shared by the cart form (client) and the order action
 * (server).
 *
 * The server is the authority — it re-checks everything from the raw request —
 * but the rules live here so the two sides can never drift: the customer sees
 * the same message the server would have raised, before the payment modal ever
 * opens.
 *
 * Nothing here touches the database or the browser, so both environments can
 * import it. Formatting/whitespace/sanitising belong to `validation.ts`
 * (server-side zod), not here.
 */

/** Most of one product the cart will hold — mirrored by the server's schema. */
export const MAX_LINE_QTY = 99;

/**
 * Cart lines in one order. This is a payload guard for the server (a shopper
 * cannot reasonably assemble 100 different products in one order); the cart's
 * own UI has no way to express it.
 */
export const MAX_CART_LINES = 100;

export type CheckoutDetails = {
  name: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state?: string | null;
  postal: string;
  country: string;
};

export type CheckoutDetailErrors = Partial<
  Record<
    | "name"
    | "email"
    | "phone"
    | "addressLine1"
    | "addressLine2"
    | "city"
    | "state"
    | "postal"
    | "country",
    string
  >
>;

/** Digits only — the way a courier reads a phone number. */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * True for 7–15 digits however the number is written (+91 88283 38323,
 * 88283-38323, 0091…). The range covers a national number and the full E.164
 * length, so it works for both storefronts without inventing per-country rules.
 */
export function isPlausiblePhone(value: string): boolean {
  const digits = phoneDigits(value);
  return digits.length >= 7 && digits.length <= 15;
}

/** India PINs are six digits and never start with 0; spaces/dashes tolerated. */
export function isIndiaPin(value: string): boolean {
  return /^[1-9][0-9]{5}$/.test(value.replace(/[\s-]/g, ""));
}

const EMAIL_RE = /^\S+@\S+\.\S+$/;

/**
 * The shipping/contact rules both sides enforce. `requireIndiaAddress` is on
 * for the local (India) store: its invoices need the State as the GST place of
 * supply, and its parcels need a real PIN. The international store reads its
 * addresses by country, so both stay optional there.
 */
export function validateCheckoutDetails(
  values: CheckoutDetails,
  options: { requireIndiaAddress?: boolean } = {},
): CheckoutDetailErrors {
  const errors: CheckoutDetailErrors = {};
  if (!values.name.trim()) errors.name = "Name is required";
  if (!values.email.trim()) errors.email = "Email is required";
  else if (!EMAIL_RE.test(values.email.trim()))
    errors.email = "Enter a valid email address";
  if (!values.phone.trim()) errors.phone = "Phone is required";
  else if (!isPlausiblePhone(values.phone))
    errors.phone = "Enter a valid phone number (7–15 digits)";
  if (!values.addressLine1.trim())
    errors.addressLine1 = "Address line 1 is required";
  if (!values.city.trim()) errors.city = "City is required";
  if (options.requireIndiaAddress) {
    if (!values.state?.trim()) errors.state = "State is required";
    if (!values.postal.trim()) errors.postal = "Postal code is required";
    else if (!isIndiaPin(values.postal))
      errors.postal = "Enter a valid 6-digit PIN code";
  } else if (!values.postal.trim()) {
    errors.postal = "Postal code is required";
  }
  if (!values.country.trim()) errors.country = "Country is required";
  return errors;
}
