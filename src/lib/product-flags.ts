/**
 * Per-store sale state for products.
 *
 * Every product answers the same four questions per store — price, show,
 * pre-order, buy now — so the two storefronts can differ. Prices already did
 * (`priceCents` / `globalPriceCents`, resolved by `priceForVersion`); these
 * helpers do the same for the three flags.
 *
 * Pure and free of React/database, so the rules are unit tested and shared by
 * the storefront, the listing filters and the admin.
 */

import type { SiteVersion } from "@/lib/site-version";

/**
 * The per-store fields a product carries. The `global*` twins are optional so
 * static/legacy rows without them fall back to the local value (the same
 * fallback the price uses).
 */
export interface ProductStoreFlags {
  /** Local (India) store: shown at all. */
  isActive?: boolean;
  /** Local (India) store: sold as a pre-order. */
  isPreOrder?: boolean;
  /** Local (India) store: sold immediately. */
  buyNowEnabled?: boolean;
  /** International store: shown at all. Falls back to `isActive`. */
  globalIsActive?: boolean;
  /** International store: sold as a pre-order. Falls back to `isPreOrder`. */
  globalIsPreOrder?: boolean;
  /** International store: sold immediately. Falls back to `buyNowEnabled`. */
  globalBuyNowEnabled?: boolean;
}

/** How a product is sold on one store. */
export type ProductSaleState = "preorder" | "buynow" | "unavailable";

/** Whether the product is listed on this store at all. */
export function visibleForVersion(
  product: ProductStoreFlags,
  version: SiteVersion,
): boolean {
  if (version === "global") {
    return product.globalIsActive ?? product.isActive ?? true;
  }
  return product.isActive ?? true;
}

/** Whether this store sells the product as a pre-order. */
export function preOrderForVersion(
  product: ProductStoreFlags,
  version: SiteVersion,
): boolean {
  if (version === "global") {
    return product.globalIsPreOrder ?? product.isPreOrder ?? false;
  }
  return product.isPreOrder ?? false;
}

/**
 * Whether this store sells the product immediately. The brand's rollout flag
 * (`Brand.buyNowEnabled`) is ORed in, so enabling a brand covers all of its
 * products on both stores until a product is edited.
 */
export function buyNowForVersion(
  product: ProductStoreFlags,
  version: SiteVersion,
  brandBuyNow = false,
): boolean {
  if (brandBuyNow) return true;
  if (version === "global") {
    return product.globalBuyNowEnabled ?? product.buyNowEnabled ?? false;
  }
  return product.buyNowEnabled ?? false;
}

/**
 * How the store sells the product: buy-now wins over pre-order (a product
 * flagged both is bought outright), and a product with neither flag is shown
 * but not purchasable yet ("coming soon").
 */
export function saleStateForVersion(
  product: ProductStoreFlags,
  version: SiteVersion,
  brandBuyNow = false,
): ProductSaleState {
  if (buyNowForVersion(product, version, brandBuyNow)) return "buynow";
  if (preOrderForVersion(product, version)) return "preorder";
  return "unavailable";
}
