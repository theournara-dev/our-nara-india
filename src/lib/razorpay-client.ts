"use client";

import { createOrder, type CreateOrderInput } from "@/app/actions/orders";
import { CartChangedError } from "@/lib/cart-quote";
import { SITE } from "@/lib/constants";
import { getActiveVersion, getVersionConfig } from "@/lib/site-version";

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
    Razorpay?: new (options: RazorpayCheckoutOptions) => {
      open: () => void;
      close: () => void;
    };
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
    // The coupon changes the amount charged, so it is part of the intent: a
    // re-submit after applying one must not reuse the undiscounted order.
    input.couponCode ?? "",
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
): Promise<{ orderId: string; orderNumber: string; free: boolean }> {
  // Payments are disabled on this version (e.g. global) — refuse the checkout
  // up front so neither the internal order nor the Razorpay modal is created.
  if (!getVersionConfig(getActiveVersion()).paymentsEnabled) {
    throw new Error(
      "Payment is not available yet on this site. Please check back soon.",
    );
  }

  // 1. Create the internal PENDING order (server-side totals). The action
  // returns structured results instead of throwing — production builds mask
  // thrown Server Action messages with an opaque digest, so expected failures
  // arrive as `ok: false` with a user-safe message.
  const result = await createOrder({ ...input, cartToken: cartToken(input) });
  if (!result.ok) {
    // A stale cart is not a payment failure: the caller needs the quote to
    // re-price the cart and let the shopper review it.
    if (result.code === "CART_CHANGED" && result.quote) {
      throw new CartChangedError(result.quote);
    }
    throw new Error(result.message);
  }
  const order = result;

  // A coupon can cover the whole order. Razorpay cannot charge 0, so complete
  // it server-side instead of opening the payment modal.
  if (result.totalCents <= 0) {
    const response = await fetch("/api/orders/free", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: result.orderId }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error ?? "Could not complete the free order.");
    }
    return {
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      free: true,
    };
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

  // Defense in depth: never open the modal with a currency other than the one
  // the active store charges in. A legacy order (e.g. one priced in USD before
  // the global store moved to INR) must not reach the payment modal.
  const expectedCurrency = getVersionConfig(getActiveVersion()).currency;
  if (data.currency && data.currency !== expectedCurrency) {
    throw new Error(
      "This order was placed in a currency we no longer support. Please place a new order.",
    );
  }

  // 3. Load the checkout script and open the modal.
  await loadCheckoutScript();
  const RazorpayCtor = window.Razorpay;
  if (!RazorpayCtor) {
    throw new Error("Payment gateway is not available.");
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let checkout: { open: () => void; close: () => void } | null = null;
    const options: RazorpayCheckoutOptions = {
      key: data.keyId!,
      amount: data.amountMinor!,
      currency: data.currency ?? expectedCurrency,
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
        // The handler only fires after a successful payment, so the purchase is
        // final now. Mark it settled and dismiss the gateway immediately — it
        // must not stay on screen while (or if) verification is slow, and a
        // user closing it during that wait must not cancel a paid order.
        settled = true;
        try {
          checkout?.close();
        } catch {
          // Already closed by the gateway — nothing to do.
        }
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
        resolve({
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          free: false,
        });
      },
      modal: {
        ondismiss: () => {
          if (settled) return;
          settled = true;
          reject(new Error("Payment cancelled."));
        },
      },
    };
    checkout = new RazorpayCtor(options);
    checkout.open();
  });
}
