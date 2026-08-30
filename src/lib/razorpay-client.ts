"use client";

import { createOrder, type CreateOrderInput } from "@/app/actions/orders";
import { SITE } from "@/lib/constants";

/**
 * Client-side Razorpay checkout. Loads the Razorpay checkout script on demand
 * and opens the payment modal. The flow is:
 *
 *   1. createOrder()  → persists a PENDING internal Order (totals from the DB)
 *   2. POST /api/razorpay/order → creates a Razorpay order + returns key/order id
 *   3. open the Razorpay modal with the amount and customer prefill
 *
 * Resolves with the internal order on payment success; rejects on failure,
 * cancellation, or any setup error. Callers clear the cart on success.
 */

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
  theme?: { color?: string };
}

let scriptPromise: Promise<void> | null = null;

function loadCheckoutScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Razorpay checkout is client-only."));
      return;
    }
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(
        new Error("Could not load the payment gateway. Please try again."),
      );
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Stable idempotency token for one checkout attempt: derived from the cart
 * contents + customer details. Double-submits and server-action retries hash
 * to the same token, so the server reuses the PENDING order instead of
 * creating a duplicate.
 */
function cartToken(input: CreateOrderInput): string {
  const canonical = JSON.stringify([
    ...input.items
      .map((i) => [i.productId, i.variantId ?? "", i.quantity])
      .sort(),
    input.name,
    input.email,
    input.phone ?? "",
    input.addressLine1 ?? "",
    input.addressLine2 ?? "",
    input.city ?? "",
    input.state ?? "",
    input.postal ?? "",
    input.country ?? "",
  ]);
  // Simple non-crypto hash (FNV-1a), zero-padded to a fixed width so the
  // server-side zod min(8) can never reject a short run. Collisions only
  // matter for identical intents, and the server matches on email too.
  let h = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    h ^= canonical.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `cart-${(h >>> 0).toString(36).padStart(7, "0")}`;
}

export async function checkoutWithRazorpay(
  input: CreateOrderInput,
): Promise<{ orderId: string; orderNumber: string }> {
  // 1. Create the internal PENDING order (server-side totals).
  let order: { orderId: string; orderNumber: string };
  try {
    order = await createOrder({ ...input, cartToken: cartToken(input) });
  } catch (err) {
    // Server actions surface ZodError as a serialized JSON blob — show a
    // readable message instead.
    if (err instanceof Error && err.message.includes("Your cart is empty.")) {
      throw new Error("Your cart is empty.");
    }
    if (
      err instanceof Error &&
      (err.message.includes("Name is required") ||
        err.message.includes("Enter a valid email"))
    ) {
      throw new Error("Please enter a valid name and email address.");
    }
    throw err;
  }

  // 2. Create the Razorpay order.
  const res = await fetch("/api/razorpay/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: order.orderId }),
  });
  const data = (await res.json()) as {
    keyId?: string;
    razorpayOrderId?: string;
    amountMinor?: number;
    currency?: string;
    error?: string;
  };
  if (!res.ok || !data.keyId || !data.razorpayOrderId) {
    throw new Error(data.error ?? "Could not initiate payment.");
  }

  // 3. Load the checkout script and open the modal.
  await loadCheckoutScript();
  const RazorpayCtor = window.Razorpay;
  if (!RazorpayCtor) {
    throw new Error("Payment gateway is not available.");
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const options: RazorpayCheckoutOptions = {
      key: data.keyId!,
      amount: data.amountMinor!,
      currency: data.currency ?? "INR",
      name: SITE.name,
      description: `Order ${order.orderNumber}`,
      order_id: data.razorpayOrderId!,
      prefill: {
        name: input.name,
        email: input.email,
        contact: input.phone || undefined,
      },
      notes: { internalOrderId: order.orderId },
      theme: { color: "#6F2DBD" },
      handler: async (response) => {
        if (settled) return;
        // Verify the handler signature server-side before declaring success.
        // This doesn't gate the webhook (still authoritative), but stops the
        // UI from showing "successful" for an unverifiable payment.
        try {
          const res = await fetch("/api/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          if (!res.ok) {
            const data = (await res.json().catch(() => ({}))) as {
              error?: string;
            };
            settled = true;
            reject(
              new Error(
                data.error ??
                  "We couldn't confirm your payment. If you were charged, our team will verify it shortly.",
              ),
            );
            return;
          }
        } catch {
          // Network hiccup during verification: don't hard-fail the purchase —
          // the webhook will still reconcile it.
        }
        settled = true;
        resolve({ orderId: order.orderId, orderNumber: order.orderNumber });
      },
      modal: {
        ondismiss: () => {
          if (settled) return;
          settled = true;
          reject(new Error("Payment cancelled."));
        },
      },
    };
    new RazorpayCtor(options).open();
  });
}
