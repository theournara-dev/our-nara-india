import { useSyncExternalStore } from "react";

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

function read(): CartItem[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
    cache = Array.isArray(parsed) ? parsed : [];
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
  return addToCart({
    productId: product.id,
    slug: product.slug,
    name: product.name,
    image: product.images[0] ?? "",
    priceCents: product.priceCents,
    currency: product.currency,
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
