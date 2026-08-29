"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  clearCart,
  removeCartItem,
  updateCartItemQty,
  useCart,
} from "@/lib/cart";
import { formatMoney } from "@/lib/money";
import { checkoutWithRazorpay } from "@/lib/razorpay-client";
import { friendlyPaymentError } from "@/lib/payment-errors";
import { notify, notifyErrorWithContact } from "@/lib/toast";
import { UserInfoForm, useUserInfo } from "./user-info-form";

/**
 * Right-side "quick purchase" drawer opened from the product page's BUY NOW
 * button (and the header cart icon). Lists every item in the cart, collects the
 * customer's contact + shipping details, and shows a subtotal/total block.
 *
 * "Place order" creates the internal order and opens the Razorpay checkout
 * modal; on success the cart is cleared and the drawer closes.
 */
export function QuickPurchaseSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const items = useCart();
  const { values: userInfo, setValues: setUserInfo } = useUserInfo();
  const [placing, setPlacing] = useState(false);
  // Vertical offset so the drawer slides in below the header instead of
  // underneath it. Measured from the header bar (responsive height), clamped to
  // 0 when the page is scrolled and the header is off-screen.
  const [topOffset, setTopOffset] = useState(0);
  // Bumped after the payment modal closes so the scroll lock is re-asserted
  // (the Razorpay modal restores body overflow when it dismisses, which can
  // undo our lock while the sheet is still open).
  const [lockTick, setLockTick] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Lock page scroll (html + body) and measure the header while the drawer is
  // open. Locking only <body> leaves the root scroller (the <html> element)
  // free to scroll, so wheeling over the drawer's non-scrollable header would
  // still scroll the page behind it.
  useEffect(() => {
    if (!open) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    // Only the sheet's own scrollable body may scroll. Wheeling or touching
    // over the header, footer, or backdrop must never scroll the page behind
    // the sheet — even if the overflow lock is momentarily lost (e.g. after the
    // Razorpay modal closes).
    const overlay = overlayRef.current;
    const body = bodyRef.current;
    const preventScroll = (e: WheelEvent | TouchEvent) => {
      if (body && body.contains(e.target as Node)) return;
      e.preventDefault();
    };
    overlay?.addEventListener("wheel", preventScroll, { passive: false });
    overlay?.addEventListener("touchmove", preventScroll, { passive: false });

    const measure = () => {
      const header = document.querySelector<HTMLElement>("[data-site-header]");
      const bottom = header?.getBoundingClientRect().bottom ?? 0;
      setTopOffset(Math.max(0, bottom));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
      overlay?.removeEventListener("wheel", preventScroll);
      overlay?.removeEventListener("touchmove", preventScroll);
      window.removeEventListener("resize", measure);
    };
  }, [open, lockTick]);

  const subtotalCents = items.reduce((s, i) => s + i.priceCents * i.qty, 0);
  const currency = items[0]?.currency ?? "INR";
  const shippingCents = 0; // free shipping
  const totalCents = subtotalCents + shippingCents;

  async function placeOrder() {
    if (items.length === 0) return;
    if (!userInfo.name.trim() || !userInfo.email.trim()) {
      notify.error(
        "no-details",
        "Missing details",
        "Please fill in your contact and shipping details.",
      );
      return;
    }
    setPlacing(true);
    const id = notify.loading("Placing order…");
    try {
      const { orderNumber } = await checkoutWithRazorpay({
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.option,
          quantity: i.qty,
        })),
        name: userInfo.name,
        email: userInfo.email,
        phone: userInfo.phone,
        addressLine1: userInfo.addressLine1,
        addressLine2: userInfo.addressLine2,
        city: userInfo.city,
        state: userInfo.state,
        postal: userInfo.postal,
        country: userInfo.country,
      });
      clearCart();
      notify.success(
        id,
        "Payment successful!",
        `Order ${orderNumber} is confirmed.`,
      );
      onClose();
    } catch (err) {
      const friendly = friendlyPaymentError(err);
      const trace =
        err instanceof Error
          ? { name: err.name, message: err.message }
          : undefined;
      notifyErrorWithContact(id, friendly.title, friendly.hint, trace);
    } finally {
      setPlacing(false);
      // The Razorpay modal restores body overflow when it closes, which can
      // undo our scroll lock. Re-assert it so the page stays locked while the
      // sheet is still open (e.g. after a cancelled payment).
      setLockTick((t) => t + 1);
    }
  }

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-zinc-900/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Quick purchase"
        style={{ top: topOffset }}
        className={`absolute right-0 bottom-0 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Quick purchase
            </h2>
            <p className="text-xs text-zinc-400">
              {items.length} {items.length === 1 ? "item" : "items"} in your
              cart
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          ref={bodyRef}
          className="flex-1 overflow-y-auto overscroll-contain px-5 py-4"
        >
          {items.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-3xl">🛍️</p>
              <p className="mt-3 text-sm text-zinc-500">Your cart is empty.</p>
              <Link
                href="/category/skin-care"
                onClick={onClose}
                className="mt-4 inline-flex h-10 items-center justify-center rounded border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Start shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Cart items */}
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Items
                </h3>
                <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-100">
                  {items.map((item) => (
                    <li
                      key={`${item.productId}-${item.option ?? ""}`}
                      className="flex items-center gap-3 p-3"
                    >
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={48}
                          height={48}
                          unoptimized
                          className="h-12 w-12 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 shrink-0 rounded bg-zinc-100" />
                      )}
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/products/${item.slug}`}
                          onClick={onClose}
                          className="block truncate text-sm font-medium text-zinc-900 hover:text-point-500"
                        >
                          {item.name}
                        </Link>
                        {item.option && (
                          <p className="text-xs text-zinc-400">{item.option}</p>
                        )}
                        <p className="text-xs text-zinc-500">
                          {formatMoney(item.priceCents, item.currency)}
                        </p>
                        {/* Qty stepper + remove */}
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex items-center rounded border border-zinc-200">
                            <button
                              type="button"
                              aria-label={`Decrease quantity of ${item.name}`}
                              onClick={() =>
                                updateCartItemQty(
                                  item.productId,
                                  item.option,
                                  item.qty - 1,
                                )
                              }
                              className="flex h-7 w-7 cursor-pointer items-center justify-center text-zinc-600 hover:text-point-500"
                            >
                              −
                            </button>
                            <span className="w-6 text-center text-sm font-semibold text-zinc-900">
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              aria-label={`Increase quantity of ${item.name}`}
                              onClick={() =>
                                updateCartItemQty(
                                  item.productId,
                                  item.option,
                                  item.qty + 1,
                                )
                              }
                              className="flex h-7 w-7 cursor-pointer items-center justify-center text-zinc-600 hover:text-point-500"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              removeCartItem(item.productId, item.option)
                            }
                            className="text-xs text-zinc-400 hover:text-rose-600"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-zinc-900">
                        {formatMoney(item.priceCents * item.qty, item.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* User details */}
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Your details
                </h3>
                <UserInfoForm
                  values={userInfo}
                  onChange={setUserInfo}
                />
              </section>
            </div>
          )}
        </div>

        {/* Footer: totals + place order */}
        {items.length > 0 && (
          <div className="border-t border-zinc-100 px-5 py-4">
            <dl className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-zinc-500">Subtotal</dt>
                <dd className="font-medium text-zinc-900">
                  {formatMoney(subtotalCents, currency)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-zinc-500">Shipping</dt>
                <dd className="font-medium text-point-500">Free</dd>
              </div>
              <div className="flex items-center justify-between border-t border-zinc-100 pt-2">
                <dt className="font-semibold text-zinc-900">Total</dt>
                <dd className="text-lg font-semibold text-zinc-900">
                  {formatMoney(totalCents, currency)}
                </dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={placeOrder}
              disabled={placing}
              className="mt-4 h-12 w-full rounded bg-point-500 text-sm font-semibold text-white transition-colors hover:bg-point-600 disabled:opacity-60"
            >
              {placing ? "Placing…" : "Place order"}
            </button>
            <p className="mt-2 text-center text-[11px] text-zinc-400">
              {userInfo.name || userInfo.email
                ? `Shipping to ${userInfo.name || "you"} · ${userInfo.email || "no email"}`
                : "Fill in your details to continue."}
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
