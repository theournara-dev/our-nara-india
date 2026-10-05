import { useSyncExternalStore } from "react";
import { getActiveVersion, getVersionConfig } from "@/lib/site-version";
import { priceForVersion } from "@/lib/money";

/**
 * Minimal client-side cart backed by localStorage. There's no cart backend yet
 * (the commerce milestone hasn't started), so this keeps the cart in the
 * browser. Swap for a server-managed cart when checkout is built.
 *
 * `useCart()` is a reactive hook (via useSyncExternalStore) so the cart page
 * re-renders when items change, including across tabs.
 */

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  image: string;
  priceCents: number;
  currency: string;
  qty: number;
  option?: string;
};

const KEY = "ournara:cart";
const EVENT = "ournara:cart";

// Stable empty snapshot for server rendering (SSR). Returning a fresh array from
// getServerSnapshot each render makes React warn about an infinite loop, so we
// reuse one frozen empty array reference.
const EMPTY_CART: CartItem[] = [];

// Memoized snapshot so useSyncExternalStore sees a stable reference between
// changes (avoids infinite re-renders). Cleared on every mutation.
let cache: CartItem[] | null = null;

/**
 * Drop cart lines whose stored currency isn't the active store's currency.
 *
 * Prices are captured at add-time, so a cart saved while a store priced in a
 * different currency (e.g. the global store used USD before it moved to INR)
 * holds minor-unit amounts that are meaningless in the current currency — and
 * checkout would reject them as stale. Dropping the stale lines self-heals
 * returning customers instead of showing wrong money.
 */
export function pruneStaleCurrency(
  items: CartItem[],
  currency: string,
): CartItem[] {
  return items.filter((item) => item.currency === currency);
}

function read(): CartItem[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
    const stored = Array.isArray(parsed) ? parsed : [];
    const current = getVersionConfig(getActiveVersion()).currency;
    const fresh = pruneStaleCurrency(stored, current);
    cache = fresh;
    if (fresh.length !== stored.length) save(fresh);
  } catch {
    cache = [];
  }
  return cache;
}

function save(cart: CartItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cart));
  } catch {
    // ignore storage errors (private mode, quota, etc.)
  }
}

function invalidate() {
  cache = null;
  try {
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // ignore
  }
}

export function getCart(): CartItem[] {
  return read();
}

/**
 * Build a CartItem from a catalog product and add it to the cart. Accepts any
 * object with the fields the cart needs, so product cards and the product
 * detail page share one code path.
 *
 * The stored price/currency are resolved for the ACTIVE site version at add
 * time. Both stores price in INR (Razorpay only settles INR), so the stored
 * `priceCents` is used as-is and the cart total always matches the version the
 * customer is shopping in.
 */
export function addProductToCart(
  product: {
    id: string;
    slug: string;
    name: string;
    images: string[];
    priceCents: number;
    currency: string;
  },
  qty = 1,
  option?: string,
): CartItem[] {
  const version = getActiveVersion();
  return addToCart({
    productId: product.id,
    slug: product.slug,
    name: product.name,
    image: product.images[0] ?? "",
    priceCents: priceForVersion(product.priceCents, undefined, version),
    currency: getVersionConfig(version).currency,
    qty,
    option,
  });
}

/** Add an item, merging with an existing line for the same product + option. */
export function addToCart(item: CartItem): CartItem[] {
  const cart = read();
  const existing = cart.find(
    (c) => c.productId === item.productId && c.option === item.option,
  );
  if (existing) {
    existing.qty += item.qty;
  } else {
    cart.push({ ...item });
  }
  save(cart);
  invalidate();
  return cart;
}

export function setCart(cart: CartItem[]): void {
  save(cart);
  invalidate();
}

/**
 * Update the quantity of a single cart line (product + option), clamped to a
 * minimum of 1. Shared by the cart page and the quick-purchase sheet.
 */
export function updateCartItemQty(
  productId: string,
  option: string | undefined,
  qty: number,
): void {
  setCart(
    read().map((i) =>
      i.productId === productId && i.option === option
        ? { ...i, qty: Math.max(1, qty) }
        : i,
    ),
  );
}

/** Remove a single cart line (product + option). Shared by the cart page and
 * the quick-purchase sheet. */
export function removeCartItem(
  productId: string,
  option: string | undefined,
): void {
  setCart(
    read().filter((i) => !(i.productId === productId && i.option === option)),
  );
}

export function clearCart(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  invalidate();
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

/** Reactive cart contents; empty on the server (SSR). */
export function useCart(): CartItem[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY_CART);
}
