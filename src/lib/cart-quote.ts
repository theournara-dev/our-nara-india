import type { CartItem } from "@/lib/cart";

export interface CartQuoteLine {
  productId: string;
  variantId: string | null;
  listPriceCents: number;
  chargedPriceCents: number;
  globalListPriceCents: number;
  globalChargedPriceCents: number;
  discountTitle: string | null;
}

export interface CartQuoteCoupon {
  code: string | null;
  valid: boolean;
  reason?: string;
  discountCents: number;
  freeShipping: boolean;
  title: string | null;
}

export interface CartQuote {
  lines: CartQuoteLine[];
  subtotalCents: number;
  coupon: CartQuoteCoupon;
  shippingCents: number;
  totalCents: number;
}

/** Thrown when the server's cart total no longer matches the client's. */
export class CartChangedError extends Error {
  readonly quote: CartQuote;

  constructor(quote: CartQuote) {
    super("Cart totals changed");
    this.name = "CartChangedError";
    this.quote = quote;
  }
}

/** Apply a server quote to the cart, re-pricing lines it recognises. */
export function applyQuote(items: CartItem[], quote: CartQuote): CartItem[] {
  return items.map((item) => {
    const line = quote.lines.find(
      (l) =>
        l.productId === item.productId && (item.option ?? null) === l.variantId,
    );
    return line
      ? {
          ...item,
          priceCents: line.chargedPriceCents,
          globalPriceCents: line.globalChargedPriceCents,
        }
      : item;
  });
}
