"use client";

import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { setCart, useCart } from "@/lib/cart";
import { formatMoney } from "@/lib/money";

export default function CartPage() {
  const items = useCart();

  function updateQty(
    productId: string,
    option: string | undefined,
    qty: number,
  ) {
    setCart(
      items.map((i) =>
        i.productId === productId && i.option === option
          ? { ...i, qty: Math.max(1, qty) }
          : i,
      ),
    );
  }

  function remove(productId: string, option: string | undefined) {
    setCart(
      items.filter((i) => !(i.productId === productId && i.option === option)),
    );
  }

  const totalCents = items.reduce((s, i) => s + i.priceCents * i.qty, 0);
  const currency = items[0]?.currency ?? "INR";

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
          <div className="mx-auto max-w-3xl">
            <ul className="divide-y divide-zinc-100 rounded-2xl border border-zinc-100 bg-white">
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
                        updateQty(item.productId, item.option, item.qty - 1)
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
                        updateQty(item.productId, item.option, item.qty + 1)
                      }
                      className="h-8 w-8 rounded border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(item.productId, item.option)}
                    className="text-sm text-zinc-400 hover:text-rose-600"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-zinc-100 bg-white p-4">
              <span className="text-sm font-medium text-zinc-600">Total</span>
              <span className="text-lg font-semibold text-zinc-900">
                {formatMoney(totalCents, currency)}
              </span>
            </div>
            <p className="mt-3 text-center text-xs text-zinc-400">
              Checkout will be enabled with the commerce milestone.
            </p>
          </div>
        )}
      </Container>
    </div>
  );
}
