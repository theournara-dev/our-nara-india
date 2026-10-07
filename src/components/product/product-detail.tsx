"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { ProductDetail, InfoRow } from "@/data/products";
import { addProductToCart } from "@/lib/cart";
import { formatMoney, priceForVersion } from "@/lib/money";
import { notifyAddedToCart } from "@/lib/toast";
import { useCartSheet } from "@/components/cart/cart-provider";
import { useSiteVersion } from "@/components/site-version-provider";
import { PreorderDialog } from "./preorder-dialog";
import { ProductBlocks } from "./blocks/block-renderer";
import { ReviewForm } from "./review-form";
import { AskQuestionDialog } from "./ask-question-dialog";
import type { ProductReviewView, ReviewSummary } from "@/data/reviews";
import type { QAView } from "@/data/qa";

interface ProductDetailProps {
  product: ProductDetail;
  /** Effective INFO rows (product override or the storewide default). */
  infoRows: InfoRow[];
  reviews: ProductReviewView[];
  reviewSummary: ReviewSummary;
  questions: QAView[];
  /** True when a user is signed in — gates review/question submission. */
  canInteract: boolean;
}

/**
 * Product detail area mirroring the original Cafe24 layout:
 * a two-column grid (image gallery / info panel) and a set of
 * DETAIL · INFO · REVIEW · Q&A tabs below. Interactivity (option
 * select, quantity stepper, tab switching) is local state; BUY NOW
 * adds to the cart and opens the quick-purchase sheet (payment is
 * wired up in the commerce milestone).
 */
export function ProductDetail({
  product,
  infoRows,
  reviews,
  reviewSummary,
  questions,
  canInteract,
}: ProductDetailProps) {
  const { version, config } = useSiteVersion();
  const { openQuickPurchase } = useCartSheet();
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [option, setOption] = useState("");
  const [preorderOpen, setPreorderOpen] = useState(false);
  // The original product page opens on DETAIL and keeps REVIEW as the last tab.
  const [tab, setTab] = useState<"DETAIL" | "INFO" | "Q&A" | "REVIEW">(
    "DETAIL",
  );
  const [askOpen, setAskOpen] = useState(false);

  const selectedVariant = product.variants.find((v) => v.id === option);
  // Gallery = the product's own images followed by each option's images, in
  // admin order — the original appends the linked option images after the
  // product's own. Duplicates (an option reusing a product image) collapse.
  const galleryImages: string[] = [];
  for (const src of [
    ...product.images,
    ...product.variants.flatMap((v) => v.images),
  ]) {
    if (src && !galleryImages.includes(src)) galleryImages.push(src);
  }
  // Where an option's first image sits in the gallery, so picking the option
  // can move the gallery straight to it.
  const firstImageIndex = new Map<string, number>();
  for (const v of product.variants) {
    const first = v.images[0];
    if (first) {
      const index = galleryImages.indexOf(first);
      if (index >= 0) firstImageIndex.set(v.id, index);
    }
  }
  const images = galleryImages;
  // A variant price overrides the product price (and re-bases the discount).
  // The override only engages when the variant has its own local price —
  // createOrder resolves the same way, so the displayed price and the amount
  // charged cannot drift apart. The global amount chains variant → product and
  // falls back to the local chain when unset (see priceForVersion).
  const variantOverride =
    selectedVariant?.priceCents != null ? selectedVariant : undefined;
  const localPrice = variantOverride?.priceCents ?? product.priceCents;
  const globalPrice = variantOverride
    ? (variantOverride.globalPriceCents ?? product.globalPriceCents)
    : product.globalPriceCents;
  const displayPrice = priceForVersion(localPrice, globalPrice, version);
  const compareAt =
    version === "global"
      ? (product.globalCompareAtCents ?? product.compareAtCents)
      : product.compareAtCents;
  const compareAtCents =
    compareAt != null && compareAt > displayPrice ? compareAt : undefined;
  const needsOption = product.variants.length > 0 && !option;
  // Option chips grouped by their label ("Shade", "Size"), kept in admin order.
  const optionGroups = product.variants.reduce<
    { label: string; items: ProductDetail["variants"] }[]
  >((groups, v) => {
    const label = v.optionLabel ?? "";
    const group = groups.find((g) => g.label === label);
    if (group) group.items.push(v);
    else groups.push({ label, items: [v] });
    return groups;
  }, []);
  // Buttons render based on product state. A pre-order shows the pre-order
  // dialog; available products show Buy Now (when enabled). They're mutually
  // exclusive — pre-orders aren't eligible for buy-now express checkout.
  // On versions without pre-orders (global), every product is directly
  // purchasable regardless of its isPreOrder/buyNowEnabled flags.
  const showPreOrder = product.isPreOrder && config.preOrderEnabled;
  const showBuyNow =
    !config.preOrderEnabled || (product.buyNowEnabled && !product.isPreOrder);

  function handleBuyNow() {
    // The chosen option's label travels with the line so the cart can show it.
    // The line stores BOTH stores' prices, so switching store re-prices it.
    addProductToCart(
      { ...product, priceCents: localPrice, globalPriceCents: globalPrice },
      qty,
      option || undefined,
      selectedVariant
        ? `${selectedVariant.optionLabel ? `${selectedVariant.optionLabel}: ` : ""}${selectedVariant.optionValue || product.name}`
        : undefined,
    );
    notifyAddedToCart(product.name, qty);
    openQuickPurchase();
  }

  function handlePreorder() {
    setPreorderOpen(true);
  }

  return (
    <div className="mx-auto box-border w-[92%] max-w-[1560px] px-2">
      <div className="flex flex-wrap">
        {/* ── Gallery (left) ── */}
        <div className="box-border w-full lg:w-[50%] lg:pr-6">
          <div className="relative aspect-square overflow-hidden rounded-xl border border-[#e9e9e9] bg-white">
            {images.length > 0 ? (
              // Every gallery image is mounted and crossfaded, so switching
              // (including from an option chip) reads like a gallery swipe
              // rather than a hard swap.
              images.map((src, i) => (
                <Image
                  key={src}
                  src={src}
                  alt={i === activeImage ? product.name : ""}
                  aria-hidden={i !== activeImage}
                  fill
                  priority={i === 0}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className={`object-cover transition-opacity duration-500 ease-in-out ${
                    i === activeImage ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))
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
                    i === activeImage ? "border-point-500" : "border-[#e9e9e9]"
                  }`}
                >
                  <Image
                    src={image}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
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
              {formatMoney(displayPrice, product.currency)}
            </span>
            {compareAtCents != null && (
              <span className="text-lg text-zinc-400 line-through">
                {formatMoney(compareAtCents, product.currency)}
              </span>
            )}
          </div>

          {showPreOrder && (
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded bg-point-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                PRE-ORDER
              </span>
              <span className="text-sm text-zinc-500">
                {product.preOrderNotice ??
                  "Order now, ships when stock arrives."}
              </span>
            </div>
          )}

          {/* Options — chips/swatches per option label, like the original */}
          {product.variants.length > 0 && (
            <div className="mt-5">
              <p className="mb-1.5 text-sm font-semibold text-ink">
                Option Information
              </p>
              <div className="space-y-3">
                {optionGroups.map((group) => (
                  <div key={group.label || "option"}>
                    {group.label && (
                      <p className="mb-1 text-xs font-medium text-[#888]">
                        {group.label}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {group.items.map((v) => {
                        const selected = option === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                              setOption(v.id);
                              // Move the gallery to the option's first image,
                              // the way picking an option swaps the original's
                              // linked main image.
                              const index = firstImageIndex.get(v.id);
                              if (index != null) setActiveImage(index);
                            }}
                            aria-pressed={selected}
                            title={v.optionValue}
                            className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                              selected
                                ? "border-point-500 bg-point-50 font-medium text-point-600"
                                : "border-[#e9e9e9] bg-white text-[#222] hover:border-point-200"
                            }`}
                          >
                            {v.color ? (
                              <span
                                aria-hidden
                                className="inline-block h-4 w-4 shrink-0 rounded-full border border-black/10"
                                style={{ backgroundColor: v.color }}
                              />
                            ) : v.images[0] ? (
                              <Image
                                src={v.images[0]}
                                alt=""
                                width={20}
                                height={20}
                                unoptimized
                                className="h-5 w-5 shrink-0 rounded-full object-cover"
                              />
                            ) : null}
                            <span>{v.optionValue}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {needsOption && (
                <p className="mt-2 text-xs text-rose-500">
                  [Required] Please select options.
                </p>
              )}
            </div>
          )}

          {/* Quantity + shipping — hidden for pre-orders (quantity is set in the
              pre-order dialog) */}
          {!showPreOrder && (
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
          )}
          <div className="mt-2 text-sm text-[#888]">
            Shipping Fee <span className="text-point-500">Free</span>
          </div>

          {/* Buy buttons — shown based on their feature flags */}
          <div className="mt-5 flex gap-2">
            {showPreOrder && (
              <button
                type="button"
                onClick={handlePreorder}
                className="h-12 flex-1 rounded bg-point-500 px-6 text-sm font-semibold text-white transition-colors hover:bg-point-600"
              >
                PRE-ORDER
              </button>
            )}
            {showBuyNow &&
              (config.paymentsEnabled ? (
                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={needsOption}
                  title={needsOption ? "Select an option first" : undefined}
                  className="h-12 flex-1 rounded border border-ink px-6 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-ink"
                >
                  BUY NOW
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Payment is not available yet on this site."
                  className="h-12 flex-1 cursor-not-allowed rounded border border-ink px-6 text-sm font-semibold text-zinc-400 opacity-70"
                >
                  Payment coming soon
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="mt-12">
        <ul className="flex w-full border-b border-[#e9e9e9] text-sm">
          {(["DETAIL", "INFO", "Q&A", "REVIEW"] as const).map((t) => (
            <li key={t} className="flex-1">
              <button
                type="button"
                onClick={() => setTab(t)}
                className={`w-full cursor-pointer px-6 py-3 font-semibold transition-colors ${
                  tab === t
                    ? "border-b-2 border-point-500 text-point-500"
                    : "text-[#888] hover:text-[#222]"
                }`}
              >
                {t === "REVIEW" ? `REVIEW(${reviewSummary.count})` : t}
              </button>
            </li>
          ))}
        </ul>

        <div className="min-h-40 py-10 text-sm leading-relaxed text-[#555]">
          {tab === "REVIEW" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-[#555]">
                  {reviewSummary.count === 0
                    ? "There are no posts to show"
                    : `${reviewSummary.average.toFixed(1)} ★ · ${reviewSummary.count} review${reviewSummary.count === 1 ? "" : "s"}`}
                </span>
                {canInteract ? (
                  <ReviewForm productId={product.id} />
                ) : (
                  <Link
                    href="/login"
                    className="rounded border border-ink px-5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-white"
                  >
                    Write a Review
                  </Link>
                )}
              </div>

              {reviews.length === 0 ? (
                <p className="text-center text-zinc-400">
                  Be the first to review this product.
                </p>
              ) : (
                <ul className="space-y-4 text-left">
                  {reviews.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-xl border border-[#e9e9e9] p-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-point-500">
                          {"★".repeat(r.rating)}
                          <span className="text-zinc-300">
                            {"★".repeat(5 - r.rating)}
                          </span>
                        </span>
                        <span className="text-xs text-[#888]">
                          {r.createdAt.slice(0, 10)}
                        </span>
                      </div>
                      {r.title && (
                        <p className="mt-1 font-semibold text-ink">{r.title}</p>
                      )}
                      <p className="mt-1 whitespace-pre-line text-sm text-[#555]">
                        {r.body}
                      </p>
                      {r.images.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {r.images.map((src) => (
                            <a
                              key={src}
                              href={src}
                              target="_blank"
                              rel="noreferrer"
                              title="Open photo"
                            >
                              <Image
                                src={src}
                                alt={`Review photo by ${r.authorName}`}
                                width={80}
                                height={80}
                                unoptimized
                                className="h-20 w-20 rounded-lg border border-[#e9e9e9] object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      )}
                      <p className="mt-2 text-xs text-[#888]">
                        — {r.authorName}
                        {r.isVerified ? " · Verified purchase" : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === "DETAIL" &&
            (product.blocks.length > 0 ? (
              <ProductBlocks blocks={product.blocks} />
            ) : product.description ? (
              <p className="whitespace-pre-line">{product.description}</p>
            ) : (
              <p className="text-center text-zinc-400">
                Product detail coming soon.
              </p>
            ))}

          {tab === "INFO" &&
            (infoRows.length > 0 ? (
              <div className="space-y-6">
                {infoRows.map((row, i) => (
                  <div key={i}>
                    {row.heading && (
                      <h3 className="mb-1 text-sm font-semibold text-[#222]">
                        {row.heading}
                      </h3>
                    )}
                    <p className="whitespace-pre-line text-sm leading-relaxed text-[#555]">
                      {row.body}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <table className="w-full border-collapse text-left text-sm">
                  <tbody>
                    <tr className="border-b border-[#eee]">
                      <th className="w-32 py-2 pr-3 font-semibold text-[#222]">
                        Name
                      </th>
                      <td className="py-2 text-[#555]">{product.name}</td>
                    </tr>
                    <tr className="border-b border-[#eee]">
                      <th className="py-2 pr-3 font-semibold text-[#222]">
                        Brand
                      </th>
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
            ))}

          {tab === "Q&A" && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-[#555]">
                  {questions.length === 0
                    ? "There are no posts to show"
                    : `${questions.length} question${questions.length === 1 ? "" : "s"}`}
                </span>
                {canInteract ? (
                  <button
                    type="button"
                    onClick={() => setAskOpen(true)}
                    className="rounded border border-ink px-5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-white"
                  >
                    Ask a question
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="rounded border border-ink px-5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-white"
                  >
                    Ask a question
                  </Link>
                )}
              </div>

              {questions.length === 0 ? (
                <p className="text-center text-zinc-400">
                  No questions yet. Be the first to ask.
                </p>
              ) : (
                <ul className="space-y-3 text-left">
                  {questions.map((q) => (
                    <li
                      key={q.id}
                      className="rounded-xl border border-[#e9e9e9] p-4"
                    >
                      <p className="font-semibold text-ink">Q. {q.question}</p>
                      {q.answer ? (
                        <p className="mt-1 whitespace-pre-line text-sm text-[#555]">
                          A. {q.answer}
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-zinc-400">
                          Awaiting answer
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <AskQuestionDialog
                open={askOpen}
                productId={product.id}
                onClose={() => setAskOpen(false)}
              />
            </div>
          )}
        </div>
      </div>

      <PreorderDialog
        open={preorderOpen}
        productId={product.id}
        productName={product.name}
        priceLabel={formatMoney(displayPrice, product.currency)}
        defaultQty={1}
        onClose={() => setPreorderOpen(false)}
      />
    </div>
  );
}
