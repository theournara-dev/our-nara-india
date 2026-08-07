"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { ProductDetail } from "@/data/products";
import { formatMoney } from "@/lib/money";

interface ProductDetailProps {
  product: ProductDetail;
}

/**
 * Product detail area mirroring the original Cafe24 layout:
 * a two-column grid (image gallery / info panel) and a set of
 * DETAIL · INFO · REVIEW · Q&A tabs below. Interactivity (option
 * select, quantity stepper, tab switching) is local state; the
 * buy buttons are present but not wired to checkout yet.
 */
export function ProductDetail({ product }: ProductDetailProps) {
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [option, setOption] = useState("");
  const [tab, setTab] = useState<"DETAIL" | "INFO" | "REVIEW" | "Q&A">("DETAIL");

  const hasDiscount =
    product.compareAtCents != null && product.compareAtCents > product.priceCents;
  const images = product.images.length ? product.images : [];

  return (
    <div className="mx-auto box-border w-[92%] max-w-[1560px] px-2">
      <div className="flex flex-wrap">
        {/* ── Gallery (left) ── */}
        <div className="box-border w-full lg:w-[50%] lg:pr-6">
          <div className="relative aspect-square overflow-hidden rounded-xl border border-[#e9e9e9] bg-white">
            {images[activeImage] ? (
              <Image
                src={images[activeImage]}
                alt={product.name}
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-[#f6f6f6] text-zinc-400">
                {product.brand.name}
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {images.map((image, i) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`relative aspect-square w-16 cursor-pointer overflow-hidden rounded-lg border ${
                    i === activeImage
                      ? "border-point-500"
                      : "border-[#e9e9e9]"
                  }`}
                >
                  <Image src={image} alt="" fill sizes="64px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Info panel (right) ── */}
        <div className="box-border w-full pt-8 lg:w-[50%] lg:pl-6 lg:pt-0">
          <Link
            href={`/brand/${product.brand.slug}`}
            className="text-sm font-medium uppercase tracking-wider text-zinc-400 hover:text-point-500"
          >
            {product.brand.name}
          </Link>
          <h1 className="mt-1 font-display text-3xl font-semibold leading-tight text-ink">
            {product.name}
          </h1>

          {product.summary && (
            <p className="mt-2 text-sm leading-relaxed text-[#777]">
              {product.summary}
            </p>
          )}

          {/* Price */}
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-point-500">
              {formatMoney(product.priceCents, product.currency)}
            </span>
            {hasDiscount && (
              <span className="text-lg text-zinc-400 line-through">
                {formatMoney(product.compareAtCents!, product.currency)}
              </span>
            )}
          </div>

          {product.isPreOrder && (
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded bg-point-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                PRE-ORDER
              </span>
              <span className="text-sm text-zinc-500">
                {product.preOrderNotice ?? "Order now, ships when stock arrives."}
              </span>
            </div>
          )}

          {/* Option select */}
          {product.variants.length > 0 && (
            <div className="mt-5">
              <p className="mb-1.5 text-sm font-semibold text-ink">
                Option Information
              </p>
              <select
                value={option}
                onChange={(e) => setOption(e.target.value)}
                className="h-10 w-full cursor-pointer rounded border border-[#e9e9e9] bg-white px-3 text-sm text-[#222] outline-none focus:border-point-500"
              >
                <option value="">Select item with details above</option>
                {product.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.optionLabel ? `${v.optionLabel}: ` : ""}
                    {v.optionValue}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quantity + shipping */}
          <div className="mt-5 flex items-center justify-between border-y border-[#e9e9e9] py-3">
            <span className="text-sm font-semibold text-ink">Quantity</span>
            <div className="flex items-center rounded border border-[#e9e9e9]">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="flex h-9 w-9 cursor-pointer items-center justify-center text-lg text-[#555] hover:text-point-500"
              >
                −
              </button>
              <span className="flex h-9 w-12 items-center justify-center text-sm font-semibold text-[#222]">
                {qty}
              </span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQty((q) => q + 1)}
                className="flex h-9 w-9 cursor-pointer items-center justify-center text-lg text-[#555] hover:text-point-500"
              >
                +
              </button>
            </div>
          </div>
          <div className="mt-2 text-sm text-[#888]">
            Shipping Fee <span className="text-point-500">Free</span>
          </div>

          {/* Buy buttons */}
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              title="Checkout & payments are coming soon"
              className="h-12 flex-1 cursor-not-allowed rounded bg-point-500 px-6 text-sm font-semibold text-white transition-colors hover:bg-point-600"
            >
              {product.isPreOrder ? "PRE-ORDER" : "ADD TO CART"}
            </button>
            <button
              type="button"
              title="Checkout & payments are coming soon"
              className="h-12 flex-1 cursor-not-allowed rounded border border-ink px-6 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-white"
            >
              BUY NOW
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-zinc-400">
            Checkout &amp; payments coming soon.
          </p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="mt-12">
        <ul className="flex justify-center border-b border-[#e9e9e9] text-sm">
          {(["DETAIL", "INFO", "REVIEW", "Q&A"] as const).map((t) => (
            <li key={t}>
              <button
                type="button"
                onClick={() => setTab(t)}
                className={`cursor-pointer px-6 py-3 font-semibold transition-colors ${
                  tab === t
                    ? "border-b-2 border-point-500 text-point-500"
                    : "text-[#888] hover:text-[#222]"
                }`}
              >
                {t === "REVIEW" ? "REVIEW(0)" : t}
              </button>
            </li>
          ))}
        </ul>

        <div className="min-h-40 px-2 py-10 text-sm leading-relaxed text-[#555]">
          {tab === "DETAIL" &&
            (product.description ?? (
              <p className="text-zinc-400">Product detail coming soon.</p>
            ))}
          {tab === "INFO" && (
            <div className="mx-auto max-w-xl">
              <table className="w-full border-collapse text-left text-sm">
                <tbody>
                  <tr className="border-b border-[#eee]">
                    <th className="w-32 py-2 pr-3 font-semibold text-[#222]">Name</th>
                    <td className="py-2 text-[#555]">{product.name}</td>
                  </tr>
                  <tr className="border-b border-[#eee]">
                    <th className="py-2 pr-3 font-semibold text-[#222]">Brand</th>
                    <td className="py-2 text-[#555]">{product.brand.name}</td>
                  </tr>
                  <tr className="border-b border-[#eee]">
                    <th className="py-2 pr-3 font-semibold text-[#222]">
                      Shipping Fee
                    </th>
                    <td className="py-2 text-[#555]">Free</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          {tab === "REVIEW" && (
            <p className="text-center text-zinc-400">No reviews yet.</p>
          )}
          {tab === "Q&A" && (
            <p className="text-center text-zinc-400">
              <Link href="/community/product-qa" className="text-point-500 hover:underline">
                Product Questions
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
