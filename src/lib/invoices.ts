import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { SiteContent } from "@/lib/site-content";
import { loadSiteConfig } from "@/lib/site-config";
import { versionForOrder } from "@/lib/site-version";
import {
  isMaharashtra,
  productTaxRates,
  resolveTaxBps,
  siteTaxRates,
  splitInclusiveTax,
} from "@/lib/tax";

/**
 * Invoice issuance and document assembly.
 *
 * An issued invoice has two halves with opposite lifecycles. Its identity —
 * number, issue date, and the issuer block — must never change retroactively,
 * so those are frozen into the `Invoice` row at issue time. Everything else
 * (bill-to, line items, totals, status, payment rows) is assembled live from
 * the order on every read, so a change to the order — status, corrected
 * address, refund — is reflected the next time the invoice is opened. That is
 * why there is no `touchInvoice`: nothing stored can go stale.
 */

/** The FROM block, as shaped by the site config and frozen in `fromSnapshot`. */
export type InvoiceFrom = SiteContent["invoice"];

export interface InvoiceLine {
  /** Order item id — the handle the admin's HSN edits save against. */
  id: string;
  name: string;
  optionValue: string | null;
  sku: string | null;
  /** HSN code: the order item's snapshot, else the product's current code. */
  hsn: string;
  /** GST rate applied to this line, basis points (null on the global store). */
  rateBps: number | null;
  quantity: number;
  /** Per-unit price in the order's stored currency (never displayed-converted). */
  unitCents: number;
  lineTotalCents: number;
}

/**
 * The India GST side of a local invoice: the taxable value behind the
 * tax-inclusive prices, the split (Maharashtra → CGST + SGST, otherwise IGST)
 * and the round-off that lifts the printed total to the nearest rupee. Null for
 * the global store, which charges no tax.
 */
export interface InvoiceTax {
  /** Maharashtra delivery (CGST + SGST) vs everywhere else (IGST). */
  intraState: boolean;
  placeOfSupply: string | null;
  /** The rate when every line shares one (for the "CGST 9%" labels). */
  uniformBps: number | null;
  taxableCents: number;
  taxCents: number;
  cgstCents: number;
  sgstCents: number;
  igstCents: number;
  roundOffCents: number;
}

export interface InvoiceBillTo {
  name: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postal: string | null;
  country: string | null;
  phone: string | null;
  email: string;
}

export interface InvoicePaymentRow {
  provider: string;
  status: string;
  providerRef: string | null;
  amountCents: number;
  currency: string;
  createdAt: string;
}

/**
 * Payments worth printing on an invoice: the ones where money actually moved.
 * A checkout attempt that was never completed (CREATED), is only held
 * (AUTHORIZED) or failed is not a payment the customer made, and listing
 * retries as if they were payments would misstate the invoice.
 */
const INVOICE_PAYMENT_STATUSES = ["CAPTURED", "REFUNDED"] as const;

/**
 * Everything the document needs. Dates are pre-serialized to ISO strings so
 * the same shape can cross the server → client boundary into the preview
 * dialogs (and be passed from either preview surface).
 */
export interface InvoiceView {
  number: string;
  issuedAt: string;
  orderId: string;
  orderNumber: string;
  orderCreatedAt: string;
  orderStatus: string;
  currency: string;
  /** Frozen at issue time; falls back to the store's current config. */
  from: InvoiceFrom;
  billTo: InvoiceBillTo;
  lines: InvoiceLine[];
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  /** India GST breakdown; null on the global store. */
  tax: InvoiceTax | null;
  payments: InvoicePaymentRow[];
}

/** The shipping Json written at checkout (see `createOrderImpl`). */
type ShippingJson = {
  name?: string;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postal?: string | null;
  country?: string | null;
};

/** Read the order's shipping Json defensively — it is untyped JSON in the DB. */
function readShipping(value: unknown): ShippingJson {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  const raw = value as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  return {
    name: str(raw.name),
    phone: str(raw.phone),
    addressLine1: str(raw.addressLine1),
    addressLine2: str(raw.addressLine2),
    city: str(raw.city),
    state: str(raw.state),
    postal: str(raw.postal),
    country: str(raw.country),
  };
}

/** The order fields the GST breakdown reads (a slice of the Prisma result). */
type TaxOrder = {
  siteVersion: string;
  taxPlaceOfSupply: string | null;
  taxRoundOffCents: number;
  shipping: unknown;
  items: {
    id: string;
    priceCents: number;
    quantity: number;
    taxRateBps: number | null;
    taxableValueCents: number | null;
    taxCents: number | null;
    cgstCents: number | null;
    sgstCents: number | null;
    igstCents: number | null;
    product: { taxRateMhBps: number | null; taxRateOtherBps: number | null };
  }[];
};

/**
 * India GST for a local order: each line's rate (the value frozen at checkout,
 * or one derived from today's rates for orders placed before the tax feature),
 * the summed split and the round-off. Returns null for the global store, which
 * charges no tax.
 */
function buildInvoiceTax(
  order: TaxOrder,
  site: SiteContent,
): { summary: InvoiceTax; rateForLine: Record<string, number> } | null {
  if (order.siteVersion !== "local") return null;

  const placeOfSupply =
    order.taxPlaceOfSupply ?? readShipping(order.shipping).state ?? null;
  const intraState = isMaharashtra(placeOfSupply);

  const rateForLine: Record<string, number> = {};
  const rates = new Set<number>();
  let taxableCents = 0;
  let cgstCents = 0;
  let sgstCents = 0;
  let igstCents = 0;

  for (const item of order.items) {
    const bps =
      item.taxRateBps ??
      resolveTaxBps(
        intraState,
        productTaxRates(item.product),
        siteTaxRates(site.taxRates),
      );
    const frozen =
      item.taxableValueCents != null &&
      item.taxCents != null &&
      item.cgstCents != null &&
      item.sgstCents != null &&
      item.igstCents != null;
    const split = frozen
      ? {
          taxableCents: item.taxableValueCents as number,
          taxCents: item.taxCents as number,
          cgstCents: item.cgstCents as number,
          sgstCents: item.sgstCents as number,
          igstCents: item.igstCents as number,
        }
      : splitInclusiveTax(item.priceCents * item.quantity, bps, intraState);

    rateForLine[item.id] = bps;
    rates.add(bps);
    taxableCents += split.taxableCents;
    cgstCents += split.cgstCents;
    sgstCents += split.sgstCents;
    igstCents += split.igstCents;
  }

  return {
    rateForLine,
    summary: {
      intraState,
      placeOfSupply,
      uniformBps: rates.size === 1 ? [...rates][0] : null,
      taxableCents,
      taxCents: cgstCents + sgstCents + igstCents,
      cgstCents,
      sgstCents,
      igstCents,
      roundOffCents: order.taxRoundOffCents,
    },
  };
}

/** Parse the frozen FROM snapshot; null when absent/unreadable (legacy rows). */
function readFromSnapshot(value: unknown): InvoiceFrom | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const raw = value as Record<string, unknown>;
  if (typeof raw.legalName !== "string") return null;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    legalName: raw.legalName,
    address: str(raw.address),
    email: str(raw.email),
    phone: str(raw.phone),
    taxId: str(raw.taxId),
    note: str(raw.note),
  };
}

/**
 * Create the invoice row for an order exactly once, freezing its number
 * (`INV-<orderNumber>`) and the FROM block of the order's store at issue time.
 *
 * Idempotent and never throws: a repeat call returns the existing invoice, and
 * a failed one returns `null` after logging, so the paid path can log and
 * continue (invoices are best-effort; the admin can re-issue by hand).
 */
export async function issueInvoiceForOrder(
  orderId: string,
): Promise<{ number: string } | null> {
  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true, siteVersion: true, currency: true },
    });
    if (!order) return null;

    const existing = await db.invoice.findUnique({ where: { orderId } });
    if (existing) return { number: existing.number };

    const site = await loadSiteConfig(versionForOrder(order));
    const invoice = await db.invoice.create({
      data: {
        orderId,
        number: `INV-${order.orderNumber}`,
        fromSnapshot: site.invoice as Prisma.InputJsonValue,
      },
    });
    return { number: invoice.number };
  } catch (error) {
    // `orderId` is unique: concurrent issuers (payment webhook, cron
    // reconciliation, a retried admin click) race between the lookup and the
    // insert. The loser lands here — return the winner's invoice instead of
    // failing the caller.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      try {
        const existing = await db.invoice.findUnique({ where: { orderId } });
        if (existing) return { number: existing.number };
      } catch (lookupError) {
        console.error(
          "[invoices] failed to read the existing invoice:",
          lookupError,
        );
      }
    }
    console.error(`[invoices] failed to issue invoice for ${orderId}:`, error);
    return null;
  }
}

/**
 * Assemble the live invoice document for an order. Returns `null` when the
 * order doesn't exist or has no invoice yet (orders placed before automatic
 * issuance) — the caller decides whether to offer issuing one.
 */
export async function buildInvoiceView(
  orderId: string,
): Promise<InvoiceView | null> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        orderBy: { id: "asc" },
        include: {
          product: {
            select: {
              hsnCode: true,
              taxRateMhBps: true,
              taxRateOtherBps: true,
            },
          },
        },
      },
      payments: {
        where: { status: { in: [...INVOICE_PAYMENT_STATUSES] } },
        orderBy: { createdAt: "asc" },
      },
      invoice: true,
    },
  });
  if (!order || !order.invoice) return null;

  const version = versionForOrder(order);
  // The stored snapshot keeps an issued invoice showing the entity that
  // actually issued it, even if /admin/site later changes it.
  const site = await loadSiteConfig(version);
  const from = readFromSnapshot(order.invoice.fromSnapshot) ?? site.invoice;
  const shipping = readShipping(order.shipping);

  // India GST (local store only). Each line prefers the values frozen at
  // checkout and falls back to the current rates for orders placed before the
  // tax feature existed.
  const tax = buildInvoiceTax(order, site);

  return {
    number: order.invoice.number,
    issuedAt: order.invoice.issuedAt.toISOString(),
    orderId: order.id,
    orderNumber: order.orderNumber,
    orderCreatedAt: order.createdAt.toISOString(),
    orderStatus: order.status,
    currency: order.currency,
    from,
    billTo: {
      name: shipping.name ?? "",
      addressLine1: shipping.addressLine1 ?? null,
      addressLine2: shipping.addressLine2 ?? null,
      city: shipping.city ?? null,
      state: shipping.state ?? null,
      postal: shipping.postal ?? null,
      country: shipping.country ?? null,
      phone: shipping.phone ?? null,
      email: order.email,
    },
    lines: order.items.map((item) => ({
      id: item.id,
      name: item.name,
      optionValue: item.optionValue,
      sku: item.sku,
      hsn: item.hsnCode ?? item.product.hsnCode ?? "",
      rateBps: tax ? (item.taxRateBps ?? tax.rateForLine[item.id]) : null,
      quantity: item.quantity,
      unitCents: item.priceCents,
      lineTotalCents: item.priceCents * item.quantity,
    })),
    subtotalCents: order.subtotalCents,
    shippingCents: order.shippingCents,
    discountCents: order.discountCents,
    totalCents: order.totalCents,
    tax: tax?.summary ?? null,
    payments: order.payments.map((p) => ({
      provider: p.provider,
      status: p.status,
      providerRef: p.providerRef,
      amountCents: p.amountCents,
      currency: p.currency,
      createdAt: p.createdAt.toISOString(),
    })),
  };
}
