"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Create an internal Order (PENDING) from the cart. This is the server-side
 * source of truth for checkout: prices and totals are recomputed from the
 * database here — never trusted from the client. The returned order id is then
 * used to create a Razorpay order and open the checkout modal.
 */

const orderItemInput = z.object({
  productId: z.string().min(1),
  /** The cart stores the selected variant id in its `option` field. */
  variantId: z.string().optional(),
  quantity: z.coerce.number().int().min(1).max(99),
});

const createOrderInput = z.object({
  items: z.array(orderItemInput).min(1, "Your cart is empty."),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal: z.string().optional(),
  country: z.string().optional(),
  /**
   * Client-generated idempotency token (stable per cart contents + details).
   * A retry or double-submit with the same token returns the existing PENDING
   * order instead of creating a duplicate.
   */
  cartToken: z.string().min(8).max(100).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderInput>;

export async function createOrder(input: CreateOrderInput) {
  const data = createOrderInput.parse(input);

  // Idempotency: a retry or double-submit with the same cart token returns
  // the existing open order instead of creating a duplicate (the customer
  // may have already opened its Razorpay modal). Scoped to the same email so
  // an FNV collision between different customers can't hand over an order,
  // and items must still match (address edits keep the same token only when
  // the client regenerates it — the token covers address fields too).
  if (data.cartToken) {
    const existing = await db.order.findFirst({
      where: {
        billing: { path: ["cartToken"], equals: data.cartToken },
        email: data.email.trim().toLowerCase(),
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
      include: { items: { select: { productId: true, variantId: true, quantity: true } } },
    });
    // Content re-check: only reuse when every requested item line matches the
    // stored order exactly (guards hash collisions AND stale tokens).
    const sameItems =
      existing &&
      existing.items.length === data.items.length &&
      data.items.every((req) =>
        existing.items.some(
          (it) =>
            it.productId === req.productId &&
            (it.variantId ?? undefined) === req.variantId &&
            it.quantity === req.quantity,
        ),
      ) &&
      existing.items.every(
        (it) =>
          data.items.some(
            (req) =>
              req.productId === it.productId &&
              (req.variantId ?? undefined) === (it.variantId ?? undefined) &&
              req.quantity === it.quantity,
          ),
      );
    if (existing && sameItems) {
      return { orderId: existing.id, orderNumber: existing.orderNumber };
    }
  }

  // Attach the signed-in user if there is one (guest checkout is allowed).
  let userId: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: await headers() });
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
      currency: true,
      isPreOrder: true,
      variants: {
        select: { id: true, optionValue: true, sku: true, priceCents: true, stock: true },
      },
    },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  // Aggregate quantity per variant across cart lines — two lines of the same
  // variant must be checked against stock COMBINED, not per-line.
  const qtyByVariant = new Map<string, number>();
  for (const item of data.items) {
    if (!item.variantId) continue;
    qtyByVariant.set(
      item.variantId,
      (qtyByVariant.get(item.variantId) ?? 0) + item.quantity,
    );
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
      throw new Error("One of the items in your cart is no longer available.");
    }

    // Effective unit price: variant price overrides the product base price
    // when the admin set one (see ProductVariant.priceCents).
    let unitPriceCents = product.priceCents;
    let optionValue: string | null = null;
    let sku: string | null = null;
    if (item.variantId) {
      const variant = product.variants.find((v) => v.id === item.variantId);
      if (!variant) {
        throw new Error("A selected option is no longer available.");
      }
      // Stock guard: refuse the order when the variant can't cover the
      // COMBINED quantity of all cart lines for it — otherwise the webhook's
      // guarded decrement would silently skip and the oversell would go
      // unnoticed.
      const totalWanted = qtyByVariant.get(variant.id) ?? item.quantity;
      if (variant.stock < totalWanted) {
        throw new Error(
          `Only ${variant.stock} left of ${product.name}${variant.optionValue ? ` (${variant.optionValue})` : ""}. Please adjust your cart.`,
        );
      }
      optionValue = variant.optionValue;
      sku = variant.sku;
      if (variant.priceCents != null) unitPriceCents = variant.priceCents;
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
      currency: product.currency,
    });
  }

  const shippingCents = 0; // free shipping
  const discountCents = 0;
  const totalCents = subtotalCents + shippingCents - discountCents;

  // Guard: mixed-currency carts are not supported (all items must share one
  // currency, otherwise the summed total would mix denominations).
  const currencies = new Set(products.map((p) => p.currency));
  if (currencies.size > 1) {
    throw new Error(
      "Your cart contains items in different currencies. Please check out separately.",
    );
  }
  const currency = products[0]?.currency ?? "INR";

  const orderNumber = `ON-${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`.toUpperCase();

  const order = await db.order.create({
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
        phone: data.phone?.trim() || null,
        addressLine1: data.addressLine1?.trim() || null,
        addressLine2: data.addressLine2?.trim() || null,
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,
        postal: data.postal?.trim() || null,
        country: data.country?.trim() || null,
      },
      items: { create: orderItems },
    },
  });

  return { orderId: order.id, orderNumber: order.orderNumber };
}
