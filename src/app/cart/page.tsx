"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import {
  UserInfoForm,
  type UserInfoValues,
} from "@/components/cart/user-info-form";
import { removeCartItem, updateCartItemQty, useCart } from "@/lib/cart";
import { formatMoney } from "@/lib/money";
import { notify } from "@/lib/toast";

export default function CartPage() {
  const items = useCart();
  const [userInfo, setUserInfo] = useState<UserInfoValues | null>(null);
  const [placing, setPlacing] = useState(false);

  const subtotalCents = items.reduce((s, i) => s + i.priceCents * i.qty, 0);
  const currency = items[0]?.currency ?? "INR";
  const shippingCents = 0; // free shipping
  const totalCents = subtotalCents + shippingCents;

  function placeOrder() {
    if (items.length === 0) return;
    setPlacing(true);
    const id = notify.loading("Placing order…");
    // Stub until the payment provider is wired up.
    setTimeout(() => {
      notify.success(
        id,
        "Order ready!",
        "Checkout with Razorpay/Stripe is coming in the commerce milestone.",
      );
      setPlacing(false);
    }, 600);
  }

  return (
    <div>
      <PageHeader eyebrow="Your basket" title="Cart" />
      <Container className="pb-16">
        {items.length === 0 ? (
          <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-zinc-200 bg-white p-12 text-center">
            <p className="text-3xl">🛍️</p>
            <p className="mt-3 text-zinc-600">Your cart is empty.</p>
            <Link
              href="/category/skin-care"
              className="mt-6 inline-flex h-10 items-center justify-center rounded border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left: items + user details */}
            <div className="space-y-6 lg:col-span-2">
              <section className="rounded-2xl border border-zinc-100 bg-white">
                <h2 className="border-b border-zinc-100 px-5 py-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Items ({items.length})
                </h2>
                <ul className="divide-y divide-zinc-100">
                  {items.map((item) => (
                    <li
                      key={`${item.productId}-${item.option ?? ""}`}
                      className="flex items-center gap-4 p-4"
                    >
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={64}
                          height={64}
                          unoptimized
                          className="h-16 w-16 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="h-16 w-16 shrink-0 rounded bg-zinc-100" />
                      )}
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/products/${item.slug}`}
                          className="block truncate font-medium text-zinc-900 hover:text-point-500"
                        >
                          {item.name}
                        </Link>
                        {item.option && (
                          <p className="text-xs text-zinc-400">{item.option}</p>
                        )}
                        <p className="text-sm text-zinc-600">
                          {formatMoney(item.priceCents, item.currency)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateCartItemQty(
                              item.productId,
                              item.option,
                              item.qty - 1,
                            )
                          }
                          className="h-8 w-8 rounded border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm font-semibold text-zinc-900">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateCartItemQty(
                              item.productId,
                              item.option,
                              item.qty + 1,
                            )
                          }
                          className="h-8 w-8 rounded border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                        >
                          +
                        </button>
                      </div>
                      <div className="w-20 text-right">
                        <p className="text-sm font-semibold text-zinc-900">
                          {formatMoney(
                            item.priceCents * item.qty,
                            item.currency,
                          )}
                        </p>
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
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-2xl border border-zinc-100 bg-white p-5">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Your details
                </h2>
                <UserInfoForm onChange={setUserInfo} />
              </section>
            </div>

            {/* Right: order summary */}
            <aside className="h-fit rounded-2xl border border-zinc-100 bg-white p-5 lg:sticky lg:top-24">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                Order summary
              </h2>
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
                {userInfo
                  ? `Shipping to ${userInfo.name || "you"} · ${userInfo.email || "no email"}`
                  : "Fill in your details to continue."}
              </p>
            </aside>
          </div>
        )}
      </Container>
    </div>
  );
}
