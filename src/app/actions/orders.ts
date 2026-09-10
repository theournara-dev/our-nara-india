"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { CheckoutError } from "@/lib/checkout-errors";
import { db } from "@/lib/db";
import { priceForVersion } from "@/lib/money";
import {
  SITE_VERSION_COOKIE,
  getVersionConfig,
  parseSiteVersion,
  resolveRequestSiteVersion,
} from "@/lib/site-version";

/**
 * Create an internal Order (PENDING) from the cart. This is the server-side
 * source of truth for checkout: prices and totals are recomputed from the
 * database here — never trusted from the client. The returned order id is then
 * used to create a Razorpay order and open the checkout modal.
 *
 * Expected failures are RETURNED as structured results, never thrown: Next.js
 * masks thrown Server Action errors in production builds, so their messages
 * would reach the client as an opaque digest and break the friendly error copy.
 */

const orderItemInput = z.object({
  productId: z.string().min(1),
  /** The cart stores the selected variant id in its `option` field. */
  variantId: z.string().optional(),
  quantity: z.coerce.number().int().min(1).max(99),
});

const requiredText = (message: string) => z.string().trim().min(1, message);

const createOrderInput = z.object({
  items: z.array(orderItemInput).min(1, "Your cart is empty."),
  name: requiredText("Name is required"),
  email: z.string().email("Enter a valid email"),
  phone: requiredText("Phone number is required"),
  addressLine1: requiredText("Address line 1 is required"),
  addressLine2: z.string().optional(),
  city: requiredText("City is required"),
  state: z.string().optional(),
  postal: requiredText("Postal code is required"),
  country: requiredText("Country is required"),
  /**
   * Subtotal the client showed in the cart (from its stored prices). The
   * server recomputes prices from the DB and refuses when they differ, so the
   * customer is never charged an amount they didn't see.
   */
  expectedSubtotalCents: z.coerce.number().int().min(0).optional(),
  /**
   * Client-generated idempotency token (stable per cart contents + details).
   * A retry or double-submit with the same token returns the existing open
   * order instead of creating a duplicate.
   */
  cartToken: z.string().min(8).max(100).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderInput>;

export type CreateOrderResult =
  | { ok: true; orderId: string; orderNumber: string }
  | { ok: false; code: string; message: string };

export async function createOrder(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  try {
    return await createOrderImpl(input);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        ok: false,
        code: "INVALID_INPUT",
        message:
          err.issues[0]?.message ?? "Please check your details and try again.",
      };
    }
    if (err instanceof CheckoutError) {
      return { ok: false, code: err.code, message: err.message };
    }
    console.error("createOrder failed:", err);
    return {
      ok: false,
      code: "UNEXPECTED",
      message:
        "Something went wrong while placing your order. You were not charged — please try again.",
    };
  }
}

async function createOrderImpl(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const data = createOrderInput.parse(input);

  // Resolve the site version. The client-side switcher writes a cookie, so it
  // wins when present; default visitors (no cookie) fall back to the host —
  // both production domains share one deployment, so the build-time default
  // can't tell them apart.
  const requestHeaders = await headers();
  const cookieStore = await cookies();
  const requestVersion =
    parseSiteVersion(cookieStore.get(SITE_VERSION_COOKIE)?.value) ??
    resolveRequestSiteVersion(
      requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
    );
  const requestConfig = getVersionConfig(requestVersion);

  // Payments are not enabled on this site version — refuse to create orders
  // so no PENDING order ever exists without a payment path behind it.
  if (!requestConfig.paymentsEnabled) {
    throw new CheckoutError(
      "PAYMENTS_DISABLED",
      "Payment is not available yet on this site. Please check back soon.",
    );
  }

  // Attach the signed-in user if there is one (guest checkout is allowed).
  let userId: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: requestHeaders });
    userId = session?.user?.id ?? null;
  } catch {
    userId = null;
  }

  // Load products from the DB to get authoritative prices (never trust client).
  const productIds = [...new Set(data.items.map((i) => i.productId))];
  const products = await db.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    select: {
      id: true,
      name: true,
      priceCents: true,
      globalPriceCents: true,
      currency: true,
      isPreOrder: true,
      stock: true,
      variants: {
        select: {
          id: true,
          optionValue: true,
          sku: true,
          priceCents: true,
          globalPriceCents: true,
          stock: true,
        },
      },
    },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  // Aggregate quantities across cart lines — two lines of the same variant (or
  // variantless product) must be checked against stock COMBINED, not per-line.
  const qtyByVariant = new Map<string, number>();
  const qtyByProduct = new Map<string, number>();
  for (const item of data.items) {
    if (item.variantId) {
      qtyByVariant.set(
        item.variantId,
        (qtyByVariant.get(item.variantId) ?? 0) + item.quantity,
      );
    } else {
      qtyByProduct.set(
        item.productId,
        (qtyByProduct.get(item.productId) ?? 0) + item.quantity,
      );
    }
  }

  const orderItems: {
    productId: string;
    variantId: string | null;
    name: string;
    optionValue: string | null;
    sku: string | null;
    priceCents: number;
    quantity: number;
    currency: string;
  }[] = [];
  let subtotalCents = 0;
  let isPreOrder = false;

  for (const item of data.items) {
    const product = productById.get(item.productId);
    if (!product) {
      throw new CheckoutError(
        "ITEM_UNAVAILABLE",
        "One of the items in your cart is no longer available.",
      );
    }

    // Effective unit price: variant price overrides the product base price
    // when the admin set one (see ProductVariant.priceCents). Prices are then
    // resolved for this request's site version: local stores INR, global
    // stores the USD globalPriceCents.
    let unitPriceCents = priceForVersion(
      product.priceCents,
      product.globalPriceCents,
      requestVersion,
    );
    let optionValue: string | null = null;
    let sku: string | null = null;
    if (item.variantId) {
      const variant = product.variants.find((v) => v.id === item.variantId);
      if (!variant) {
        throw new CheckoutError(
          "ITEM_UNAVAILABLE",
          "A selected option is no longer available.",
        );
      }
      // Stock guard: refuse the order when the variant can't cover the
      // COMBINED quantity of all cart lines for it — otherwise the webhook's
      // guarded decrement would silently skip and the oversell would go
      // unnoticed.
      const totalWanted = qtyByVariant.get(variant.id) ?? item.quantity;
      if (variant.stock < totalWanted) {
        throw new CheckoutError(
          "OUT_OF_STOCK",
          `Only ${variant.stock} left of ${product.name}${variant.optionValue ? ` (${variant.optionValue})` : ""}. Please adjust your cart.`,
        );
      }
      optionValue = variant.optionValue;
      sku = variant.sku;
      if (variant.priceCents != null) {
        unitPriceCents = priceForVersion(
          variant.priceCents,
          variant.globalPriceCents ?? product.globalPriceCents,
          requestVersion,
        );
      }
    } else if (product.stock != null) {
      // Product-level stock (variantless products only; null = untracked).
      const totalWanted = qtyByProduct.get(product.id) ?? item.quantity;
      if (product.stock < totalWanted) {
        throw new CheckoutError(
          "OUT_OF_STOCK",
          `Only ${product.stock} left of ${product.name}. Please adjust your cart.`,
        );
      }
    }

    subtotalCents += unitPriceCents * item.quantity;
    if (product.isPreOrder) isPreOrder = true;

    orderItems.push({
      productId: product.id,
      variantId: item.variantId ?? null,
      name: product.name,
      optionValue,
      sku,
      priceCents: unitPriceCents,
      quantity: item.quantity,
      currency: requestConfig.currency,
    });
  }

  const shippingCents = 0; // free shipping
  const discountCents = 0;
  const totalCents = subtotalCents + shippingCents - discountCents;

  // Price guard: the cart displays add-time prices. When the DB no longer
  // matches, stop BEFORE any payment so nobody is charged a different amount
  // than the one they saw.
  if (
    data.expectedSubtotalCents != null &&
    data.expectedSubtotalCents !== subtotalCents
  ) {
    throw new CheckoutError(
      "PRICE_CHANGED",
      "Prices have changed since you added these items to your cart. Please review your cart and try again.",
    );
  }

  const currency = requestConfig.currency;
  const orderNumber = `ON-${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`.toUpperCase();

  // Idempotency: a retry or double-submit with the same cart token reuses the
  // open (PENDING) or retryable (FAILED) order instead of creating a duplicate.
  // Serialized per token with a transaction-scoped advisory lock because the
  // token lives in a Json column and can't carry a DB unique constraint (an
  // identical repeat purchase AFTER payment must create a new order).
  const result = await db.$transaction(async (tx) => {
    if (data.cartToken) {
      // pg_advisory_xact_lock returns SQL `void`, which Prisma can't
      // deserialize — cast to text so the raw query returns a supported type.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${data.cartToken}, 0))::text`;

      const existing = await tx.order.findFirst({
        where: {
          billing: { path: ["cartToken"], equals: data.cartToken },
          email: data.email.trim().toLowerCase(),
          status: { in: ["PENDING", "FAILED"] },
        },
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            select: { productId: true, variantId: true, quantity: true },
          },
        },
      });

      // Content re-check: only reuse when every requested item line matches the
      // stored order exactly (guards hash collisions AND stale tokens), and the
      // stored total still matches today's prices.
      const sameItems =
        existing &&
        existing.totalCents === totalCents &&
        existing.items.length === data.items.length &&
        data.items.every((req) =>
          existing.items.some(
            (it) =>
              it.productId === req.productId &&
              (it.variantId ?? undefined) === req.variantId &&
              it.quantity === req.quantity,
          ),
        ) &&
        existing.items.every((it) =>
          data.items.some(
            (req) =>
              req.productId === it.productId &&
              (req.variantId ?? undefined) === (it.variantId ?? undefined) &&
              req.quantity === it.quantity,
          ),
        );

      if (existing && sameItems) {
        // A previously failed attempt is still retryable: revive it so the
        // customer gets one order per intent instead of orphaning the failed
        // one (the Razorpay order route also revives FAILED on request).
        if (existing.status === "FAILED") {
          await tx.order.update({
            where: { id: existing.id },
            data: { status: "PENDING" },
          });
        }
        return { orderId: existing.id, orderNumber: existing.orderNumber };
      }
    }

    const order = await tx.order.create({
      data: {
        orderNumber,
        userId,
        email: data.email.trim().toLowerCase(),
        status: "PENDING",
        currency,
        subtotalCents,
        shippingCents,
        discountCents,
        totalCents,
        isPreOrder,
        // cartToken lives in billing Json (unused column) for idempotent reuse.
        billing: data.cartToken ? { cartToken: data.cartToken } : undefined,
        shipping: {
          name: data.name.trim(),
          phone: data.phone.trim(),
          addressLine1: data.addressLine1.trim(),
          addressLine2: data.addressLine2?.trim() || null,
          city: data.city.trim(),
          state: data.state?.trim() || null,
          postal: data.postal.trim(),
          country: data.country.trim(),
        },
        items: { create: orderItems },
      },
    });
    return { orderId: order.id, orderNumber: order.orderNumber };
  });

  // Admins are notified from the paid path (runPaidSideEffects) — never at
  // creation, so the support inbox only sees orders that actually paid.
  return { ok: true, ...result };
}
