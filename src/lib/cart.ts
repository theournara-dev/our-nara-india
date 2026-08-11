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
  return useSyncExternalStore(subscribe, read, () => []);
}
