"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { QuickPurchaseSheet } from "./quick-purchase-sheet";

/**
 * Global cart-sheet context. Lets any component (product page BUY NOW, header
 * cart icon, product cards) open the quick-purchase drawer without prop-drilling
 * open state. The drawer itself is rendered here so it's available on every page.
 */
const CartSheetContext = createContext<{ openQuickPurchase: () => void } | null>(
  null,
);

export function CartProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openQuickPurchase = useCallback(() => setOpen(true), []);

  return (
    <CartSheetContext.Provider value={{ openQuickPurchase }}>
      {children}
      <QuickPurchaseSheet open={open} onClose={() => setOpen(false)} />
    </CartSheetContext.Provider>
  );
}

export function useCartSheet() {
  const ctx = useContext(CartSheetContext);
  if (!ctx) {
    throw new Error("useCartSheet must be used within CartProvider");
  }
  return ctx;
}
