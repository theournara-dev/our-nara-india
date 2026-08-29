/**
 * Map raw payment/checkout errors to short, human-friendly explanations with
 * a suggested next step. Unknown errors fall back to a generic message —
 * users should never see stack traces, Razorpay codes, or raw JSON.
 */

const PAYMENT_MESSAGES: { match: RegExp; title: string; hint: string }[] = [
  {
    match: /cancel/i,
    title: "Payment cancelled",
    hint: "No money was taken. You can try again whenever you're ready.",
  },
  {
    match: /cart is empty/i,
    title: "Your cart is empty",
    hint: "Add a product before checking out.",
  },
  {
    match: /name is required|valid name and email|Enter a valid email/i,
    title: "Check your details",
    hint: "Please enter your name and a valid email address.",
  },
  {
    match: /no longer available|option is no longer/i,
    title: "Item unavailable",
    hint: "One of the items in your cart just went out of stock. Please review your cart.",
  },
  {
    match: /different currencies/i,
    title: "Mixed currencies",
    hint: "Please check out items in separate orders.",
  },
  {
    match: /order not found/i,
    title: "Order expired",
    hint: "This order can no longer be paid. Please start a new checkout.",
  },
  {
    match: /not payable/i,
    title: "Order already processed",
    hint: "This order was already paid or cancelled. Please check your orders or start a new checkout.",
  },
  {
    match: /gateway|razorpay|initiate payment/i,
    title: "Payment gateway issue",
    hint: "We couldn't reach the payment service. Please try again in a moment.",
  },
  {
    match: /network|fetch|failed to fetch|timeout/i,
    title: "Connection problem",
    hint: "Your internet connection seems unstable. Please try again.",
  },
  {
    match: /bank|declined|insufficient/i,
    title: "Payment declined",
    hint: "Your bank declined the payment. Try a different card or payment method.",
  },
  {
    match: /too many|rate limit|429/i,
    title: "Too many attempts",
    hint: "Please wait a minute and try again.",
  },
];

export interface FriendlyPaymentError {
  title: string;
  hint: string;
}

/** Translate any thrown checkout error into user-friendly copy. */
export function friendlyPaymentError(err: unknown): FriendlyPaymentError {
  const message =
    err instanceof Error ? err.message : String(err ?? "Unknown error");

  for (const m of PAYMENT_MESSAGES) {
    if (m.match.test(message)) {
      return { title: m.title, hint: m.hint };
    }
  }
  return {
    title: "Payment failed",
    hint: "Something went wrong while processing your payment. You were not charged — please try again.",
  };
}