import { db } from "@/lib/db";
import type { ProductCardView } from "@/data/catalog";
import {
  discountBadge,
  discountTargetFor,
  resolvePrice,
  type DiscountRecord,
  type DiscountTarget,
} from "@/lib/discounts";
import { getLiveDiscounts } from "@/lib/discount-store";
import { priceForVersion } from "@/lib/money";
import { saleStateForVersion } from "@/lib/product-flags";
import type { SiteVersion } from "@/lib/site-version";
import type { Prisma } from "@/generated/prisma/client";
import type { CategoryFilters } from "@/lib/category-filters";
import type {
  AvailabilityFacets,
  BrandFacet,
  ListingSort,
  ProductListingPage,
} from "@/lib/product-listing";

/**
 * Database-backed product data layer. Replaces the previous static catalog so
 * the storefront reflects products managed from the admin dashboard. Function
 * signatures match the old layer, so the UI components need no changes.
 */

export type ProductCard = ProductCardView;

/** A single row of the INFO ("MORE INFORMATION") tab. */
export interface InfoRow {
  heading: string;
  body: string;
  /**
   * Whether this row shows on the storefront. Global-template rows are always
   * visible; per-product overrides can hide individual rows.
   */
  visible?: boolean;
}

/** A DETAIL-tab content block, as stored in `ProductBlock`. */
export interface ProductBlockView {
  id: string;
  type: string;
  title?: string;
  config: Record<string, unknown>;
  sortOrder: number;
}

export interface ProductDetail extends ProductCardView {
  description?: string;
  stock: number | null;
  /** Live discounts that could apply to this product (both stores). */
  discounts: DiscountRecord[];
  /** What those discounts are matched against. */
  discountTarget: DiscountTarget;
  seoTitle?: string;
  seoDescription?: string;
  /** Per-product INFO override; empty means "use the global template". */
  infoRows: InfoRow[];
  /**
   * Rows of the "Product Info" card under Buy Now (label | value). Edited per
   * product and independent of the INFO tab; empty hides the card.
   */
  buyInfoRows: InfoRow[];
  /** Ordered, active DETAIL blocks. */
  blocks: ProductBlockView[];
  /** Effective Buy Now flag: product override OR its brand's flag. */
  buyNowEnabled: boolean;
  variants: {
    id: string;
    optionLabel?: string;
    optionValue: string;
    sku: string;
    stock: number;
    /** Variant price override (falls back to the product price when unset). */
    priceCents?: number;
    /**
     * International-store variant price override, in INR like the local one.
     * Falls back to the product's global price (then the local chain) when unset.
     */
    globalPriceCents?: number;
    /** Option images: the first one leads the gallery for this option. */
    images: string[];
    /** Swatch colour (hex) for the option chip. */
    color?: string;
  }[];
}

/** Shape of a product row with its brand + variants relations. */
type ProductRow = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  shortTags: string[];
  description: string | null;
  stock: number | null;
  priceCents: number;
  globalPriceCents: number | null;
  currency: string;
  isPreOrder: boolean;
  globalIsPreOrder: boolean;
  preOrderNotice: string | null;
  images: string[];
  isActive: boolean;
  globalIsActive: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  infoRows: unknown;
  buyInfoRows: unknown;
  buyNowEnabled: boolean;
  globalBuyNowEnabled: boolean;
  brand: {
    id: string;
    slug: string;
    name: string;
    buyNowEnabled: boolean;
  };
  category: { id: string; parentId: string | null };
  subcategories: {
    category: { id: string; slug: string; parentId: string | null };
  }[];
  variants?: {
    id: string;
    optionLabel: string | null;
    optionValue: string;
    sku: string;
    stock: number;
    priceCents: number | null;
    globalPriceCents: number | null;
    images: string[];
    color: string | null;
    sortOrder: number;
  }[];
  // Only selected on the detail query (not on card lists).
  blocks?: {
    id: string;
    type: string;
    title: string | null;
    config: unknown;
    sortOrder: number;
  }[];
};

/** Shared relation set for card/list queries (no variants). */
const cardInclude = {
  brand: {
    select: { id: true, slug: true, name: true, buyNowEnabled: true },
  },
  category: { select: { id: true, parentId: true } },
  // Mid-level category assignments; the slug is what the listing chips filter
  // by, `parentId` distinguishes them from a root assignment.
  subcategories: {
    select: {
      category: { select: { id: true, slug: true, parentId: true } },
    },
  },
} as const;

/** Detail queries add variants and the active DETAIL blocks. */
const detailInclude = {
  ...cardInclude,
  variants: {
    where: { isActive: true },
    orderBy: { sortOrder: "asc" as const },
  },
  blocks: {
    where: { isActive: true },
    orderBy: { sortOrder: "asc" as const },
  },
} as const;

const listInclude = cardInclude;
const include = listInclude;

/** Everything a live discount can match this product by. */
function targetFor(p: ProductRow): DiscountTarget {
  return discountTargetFor({
    productId: p.id,
    brandId: p.brand.id,
    categoryId: p.category.id,
    categoryParentId: p.category.parentId,
    subcategories: p.subcategories,
  });
}

function toCard(
  p: ProductRow,
  discounts: DiscountRecord[] = [],
): ProductCard {
  const target = targetFor(p);
  const local = resolvePrice(p.priceCents, target, discounts, "local");
  const global = resolvePrice(
    p.globalPriceCents ?? p.priceCents,
    target,
    discounts,
    "global",
  );

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    summary: p.summary ?? undefined,
    shortTags: p.shortTags,
    priceCents: p.priceCents,
    globalPriceCents: p.globalPriceCents ?? undefined,
    effectivePriceCents: local.chargedCents,
    effectiveGlobalPriceCents: global.chargedCents,
    discountsByStore: {
      local: discountBadge(local),
      global: discountBadge(global),
    },
    currency: p.currency,
    isActive: p.isActive,
    isPreOrder: p.isPreOrder,
    buyNowEnabled: p.buyNowEnabled,
    globalIsActive: p.globalIsActive,
    globalIsPreOrder: p.globalIsPreOrder,
    globalBuyNowEnabled: p.globalBuyNowEnabled,
    subcategorySlugs: p.subcategories
      .filter((link) => link.category.parentId != null)
      .map((link) => link.category.slug),
    preOrderNotice: p.preOrderNotice ?? undefined,
    images: p.images,
    hoverImage: p.images[1] ?? p.images[0],
    brand: { slug: p.brand.slug, name: p.brand.name },
  };
}

function toDetail(
  p: ProductRow,
  discounts: DiscountRecord[] = [],
): ProductDetail {
  return {
    ...toCard(p, discounts),
    discounts,
    discountTarget: targetFor(p),
    description: p.description ?? undefined,
    stock: p.stock,
    seoTitle: p.seoTitle ?? undefined,
    seoDescription: p.seoDescription ?? undefined,
    infoRows: parseInfoRows(p.infoRows),
    buyInfoRows: parseInfoRows(p.buyInfoRows),
    blocks: (p.blocks ?? []).map((b) => ({
      id: b.id,
      type: b.type,
      title: b.title ?? undefined,
      config: isRecord(b.config) ? b.config : {},
      sortOrder: b.sortOrder,
    })),
    buyNowEnabled: p.buyNowEnabled || p.brand.buyNowEnabled,
    variants: (p.variants ?? []).map((v) => ({
      id: v.id,
      optionLabel: v.optionLabel ?? undefined,
      optionValue: v.optionValue,
      sku: v.sku,
      stock: v.stock,
      priceCents: v.priceCents ?? undefined,
      globalPriceCents: v.globalPriceCents ?? undefined,
      images: v.images,
      color: v.color ?? undefined,
    })),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Coerce a stored JSON value (from `Product.infoRows` or a
 * `ProductInfoTemplate.blocks`) into a clean `InfoRow[]`. Tolerates malformed
 * or legacy data by dropping entries that aren't `{ heading, body }` strings.
 */
export function parseInfoRows(value: unknown): InfoRow[] {
  if (!Array.isArray(value)) return [];
  const rows: InfoRow[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    const heading = typeof entry.heading === "string" ? entry.heading : "";
    const body = typeof entry.body === "string" ? entry.body : "";
    if (!heading && !body) continue;
    rows.push({ heading, body, visible: entry.visible !== false });
  }
  return rows;
}

/**
 * Storewide INFO blocks (payment / shipping / returns / inquiry). Products
 * without their own `infoRows` fall back to these.
 */
export async function getProductInfoTemplate(): Promise<InfoRow[]> {
  const row = await db.productInfoTemplate.findUnique({
    where: { key: "default" },
    select: { blocks: true },
  });
  return parseInfoRows(row?.blocks);
}

/**
 * The store's own "shown" filter, so a product hidden on one storefront never
 * reaches its listings while the other store keeps selling it.
 */
function shownWhere(version: SiteVersion) {
  return version === "global" ? { globalIsActive: true } : { isActive: true };
}

/** The store's own pre-order flag. */
function preOrderWhere(version: SiteVersion) {
  return version === "global"
    ? { globalIsPreOrder: true }
    : { isPreOrder: true };
}

/** The store's own buy-now flag. */
function buyNowWhere(version: SiteVersion) {
  return version === "global"
    ? { globalBuyNowEnabled: true }
    : { buyNowEnabled: true };
}

export async function getFeaturedProducts(
  take: number,
  version: SiteVersion,
): Promise<ProductCard[]> {
  const rows = (await db.product.findMany({
    where: shownWhere(version),
    take,
    orderBy: { createdAt: "desc" },
    include,
  })) as ProductRow[];
  const discounts = await getLiveDiscounts();
  return rows.map((row) => toCard(row, discounts));
}

/** Products this store sells immediately (its own buy-now flag). */
export async function getAvailableNow(
  take: number,
  version: SiteVersion,
): Promise<ProductCard[]> {
  const rows = (await db.product.findMany({
    where: { ...shownWhere(version), ...buyNowWhere(version) },
    take,
    orderBy: { createdAt: "desc" },
    include,
  })) as ProductRow[];
  const discounts = await getLiveDiscounts();
  return rows.map((row) => toCard(row, discounts));
}

/** Products this store sells as a pre-order (its own pre-order flag). */
export async function getPreOrderProducts(
  take: number,
  version: SiteVersion,
): Promise<ProductCard[]> {
  const rows = (await db.product.findMany({
    where: { ...shownWhere(version), ...preOrderWhere(version) },
    take,
    orderBy: { createdAt: "desc" },
    include,
  })) as ProductRow[];
  const discounts = await getLiveDiscounts();
  return rows.map((row) => toCard(row, discounts));
}

export async function getProductsByCategorySlug(
  slug: string,
  take: number,
  version: SiteVersion,
): Promise<ProductCard[]> {
  // A top-level page carries its mid-level categories' products too: either the
  // product's primary category is this one, or one of its subcategory
  // assignments lives under it.
  const rows = (await db.product.findMany({
    where: {
      ...shownWhere(version),
      OR: [
        { category: { slug } },
        { subcategories: { some: { category: { parent: { slug } } } } },
      ],
    },
    take,
    orderBy: { createdAt: "desc" },
    include,
  })) as ProductRow[];
  const discounts = await getLiveDiscounts();
  return rows.map((row) => toCard(row, discounts));
}

export async function getProductsByBrandSlug(
  slug: string,
  take: number,
  version: SiteVersion,
): Promise<ProductCard[]> {
  const rows = (await db.product.findMany({
    where: { ...shownWhere(version), brand: { slug } },
    take,
    orderBy: { createdAt: "desc" },
    include,
  })) as ProductRow[];
  const discounts = await getLiveDiscounts();
  return rows.map((row) => toCard(row, discounts));
}

/** This store's pre-order bucket; buy-now wins when a product has both flags. */
function listingPreOrderWhere(version: SiteVersion): Prisma.ProductWhereInput {
  return {
    AND: [
      version === "global" ? { globalIsPreOrder: true } : { isPreOrder: true },
      { NOT: buyNowWhere(version) },
    ],
  };
}

/**
 * The effective (discounted) price of a card for one store, in minor units.
 */
function effectivePriceCents(
  card: ProductCardView,
  version: SiteVersion,
): number {
  return priceForVersion(
    card.effectivePriceCents,
    card.effectiveGlobalPriceCents,
    version,
  );
}

/** Whether the card's effective price falls inside the rupee price facet. */
function inPriceRange(
  card: ProductCardView,
  filters: CategoryFilters,
  version: SiteVersion,
): boolean {
  const rupees = Math.round(effectivePriceCents(card, version) / 100);
  return (
    (filters.minRupees == null || rupees >= filters.minRupees) &&
    (filters.maxRupees == null || rupees <= filters.maxRupees)
  );
}

interface ListingWhereOptions {
  categorySlug?: string;
  brandSlug?: string;
  query?: string;
  filters: CategoryFilters;
  version: SiteVersion;
  includeBrandFilter?: boolean;
  includeAvailability?: boolean;
}

/** One predicate builder for rows, totals and facets. */
function listingWhere({
  categorySlug,
  brandSlug,
  query,
  filters,
  version,
  includeBrandFilter = true,
  includeAvailability = true,
}: ListingWhereOptions): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [shownWhere(version)];

  if (categorySlug) {
    and.push({
      OR: [
        { category: { slug: categorySlug } },
        {
          subcategories: {
            some: { category: { parent: { slug: categorySlug } } },
          },
        },
      ],
    });
  }
  if (brandSlug) and.push({ brand: { slug: brandSlug } });
  if (query) {
    and.push({
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { summary: { contains: query, mode: "insensitive" } },
        { brand: { name: { contains: query, mode: "insensitive" } } },
      ],
    });
  }
  if (filters.sub) {
    and.push({
      subcategories: { some: { category: { slug: filters.sub } } },
    });
  }
  if (includeBrandFilter && filters.brands.length > 0) {
    and.push({ brand: { slug: { in: filters.brands } } });
  }

  if (includeAvailability && filters.availability.length > 0) {
    const buckets: Prisma.ProductWhereInput[] = [];
    if (filters.availability.includes("ready")) {
      buckets.push(buyNowWhere(version));
    }
    if (filters.availability.includes("preorder")) {
      buckets.push(listingPreOrderWhere(version));
    }
    if (buckets.length === 1) and.push(buckets[0]);
    else if (buckets.length > 1) and.push({ OR: buckets });
  }

  return { AND: and };
}

function listingOrderBy(
  sort: ListingSort,
): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "name":
      return [{ name: "asc" }, { id: "asc" }];
    case "manufacturer":
      return [{ brand: { name: "asc" } }, { id: "asc" }];
    case "new":
    case "review":
    default:
      return [{ createdAt: "desc" }, { id: "desc" }];
  }
}

async function listingBrandFacets(
  where: Prisma.ProductWhereInput,
): Promise<BrandFacet[]> {
  const groups = await db.product.groupBy({
    by: ["brandId"],
    where,
    _count: { _all: true },
  });
  if (groups.length === 0) return [];
  const brands = await db.brand.findMany({
    where: { id: { in: groups.map((group) => group.brandId) } },
    select: { id: true, slug: true, name: true },
  });
  const byId = new Map(brands.map((brand) => [brand.id, brand]));
  return groups
    .map((group) => {
      const brand = byId.get(group.brandId);
      return brand
        ? { slug: brand.slug, name: brand.name, count: group._count._all }
        : null;
    })
    .filter((facet): facet is BrandFacet => Boolean(facet))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function listingAvailabilityFacets(
  where: Prisma.ProductWhereInput,
  version: SiteVersion,
): Promise<AvailabilityFacets> {
  // Match the cards' sale state exactly: the product's own flag for this
  // store, with buy-now winning over pre-order.
  const [ready, preorder] = await Promise.all([
    db.product.count({
      where: { AND: [where, buyNowWhere(version)] },
    }),
    db.product.count({
      where: { AND: [where, listingPreOrderWhere(version)] },
    }),
  ]);
  return { ready, preorder };
}

export interface ProductListingOptions {
  categorySlug?: string;
  brandSlug?: string;
  query?: string;
  filters: CategoryFilters;
  sort: ListingSort;
  page: number;
  pageSize?: number;
  version: SiteVersion;
  /** Brand/availability counts are only needed by category listings. */
  includeFacets?: boolean;
}

/**
 * One page of a category, brand or search listing, plus the full filtered total
 * and (for category pages) the full facet counts. Every count uses the same
 * predicate as the rows, so a brand can never disappear just because its
 * products fall outside the current page.
 */
export async function getProductListing({
  categorySlug,
  brandSlug,
  query,
  filters,
  sort,
  page,
  pageSize = 48,
  version,
  includeFacets = true,
}: ProductListingOptions): Promise<ProductListingPage> {
  const size = Math.min(96, Math.max(1, Math.floor(pageSize) || 48));
  const requestedPage = Math.max(1, Math.floor(page) || 1);
  const discounts = await getLiveDiscounts();
  const hasPriceFilter =
    filters.minRupees != null || filters.maxRupees != null;
  const pricePath =
    hasPriceFilter || sort === "lowest" || sort === "highest";
  const where = listingWhere({
    categorySlug,
    brandSlug,
    query,
    filters,
    version,
  });

  let cards: ProductCardView[];
  let total: number;
  let totalPages: number;
  let effectivePage: number;

  if (pricePath) {
    // The price facet and price order use the discounted amount, which only
    // exists after `toCard`, so the SQL predicate cannot express them.
    // shortcut: price filter/sort loads every matching product; move it into SQL if the catalog passes a few thousand rows.
    const rows = (await db.product.findMany({
      where,
      // Keeps the requested name/brand order when only the price filter sent
      // us down this path; price sorts override it below.
      orderBy: listingOrderBy(sort),
      include: cardInclude,
    })) as ProductRow[];
    cards = rows.map((row) => toCard(row, discounts));
    if (hasPriceFilter) {
      cards = cards.filter((card) => inPriceRange(card, filters, version));
    }
    if (sort === "lowest" || sort === "highest") {
      const direction = sort === "lowest" ? 1 : -1;
      cards.sort(
        (a, b) =>
          direction *
            (effectivePriceCents(a, version) -
              effectivePriceCents(b, version)) ||
          (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      );
    }
    total = cards.length;
    totalPages = Math.max(1, Math.ceil(total / size));
    effectivePage = Math.min(requestedPage, totalPages);
    cards = cards.slice(
      (effectivePage - 1) * size,
      effectivePage * size,
    );
  } else {
    total = await db.product.count({ where });
    totalPages = Math.max(1, Math.ceil(total / size));
    effectivePage = Math.min(requestedPage, totalPages);
    const rows = (await db.product.findMany({
      where,
      orderBy: listingOrderBy(sort),
      skip: (effectivePage - 1) * size,
      take: size,
      include: cardInclude,
    })) as ProductRow[];
    cards = rows.map((row) => toCard(row, discounts));
  }

  let brandFacets: BrandFacet[] = [];
  let availabilityFacets: AvailabilityFacets = { preorder: 0, ready: 0 };
  if (includeFacets) {
    const withoutBrand = listingWhere({
      categorySlug,
      brandSlug,
      query,
      filters,
      version,
      includeBrandFilter: false,
    });
    const withoutAvailability = listingWhere({
      categorySlug,
      brandSlug,
      query,
      filters,
      version,
      includeAvailability: false,
    });
    if (hasPriceFilter) {
      // Facets must agree with the visible grid, so they are counted from the
      // same effective-price filter rather than the (price-free) SQL predicate.
      const [brandRows, availabilityRows] = await Promise.all([
        db.product.findMany({ where: withoutBrand, include: cardInclude }),
        db.product.findMany({
          where: withoutAvailability,
          include: cardInclude,
        }),
      ]);
      const brandCards = (brandRows as ProductRow[])
        .map((row) => toCard(row, discounts))
        .filter((card) => inPriceRange(card, filters, version));
      const availabilityCards = (availabilityRows as ProductRow[])
        .map((row) => toCard(row, discounts))
        .filter((card) => inPriceRange(card, filters, version));

      const brandCounts = new Map<string, BrandFacet>();
      for (const card of brandCards) {
        const facet = brandCounts.get(card.brand.slug);
        if (facet) {
          facet.count += 1;
        } else {
          brandCounts.set(card.brand.slug, {
            slug: card.brand.slug,
            name: card.brand.name,
            count: 1,
          });
        }
      }
      brandFacets = [...brandCounts.values()].sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      for (const card of availabilityCards) {
        const state = saleStateForVersion(card, version);
        if (state === "buynow") availabilityFacets.ready += 1;
        else if (state === "preorder") availabilityFacets.preorder += 1;
      }
    } else {
      [brandFacets, availabilityFacets] = await Promise.all([
        listingBrandFacets(withoutBrand),
        listingAvailabilityFacets(withoutAvailability, version),
      ]);
    }
  }

  return {
    products: cards,
    total,
    page: effectivePage,
    pageSize: size,
    totalPages,
    hasMore: effectivePage < totalPages,
    brandFacets,
    availabilityFacets,
  };
}

/**
 * Products matching the given slugs, preserving slug order (missing skipped).
 * Hidden-on-this-store products are dropped, so curated lists (triple banner,
 * page-builder sections) follow the store's own show flag.
 */
export async function getProductsBySlugs(
  slugs: string[],
  version: SiteVersion,
): Promise<ProductCard[]> {
  if (slugs.length === 0) return [];
  const rows = (await db.product.findMany({
    where: { ...shownWhere(version), slug: { in: slugs } },
    include,
  })) as ProductRow[];
  const bySlug = new Map(rows.map((p) => [p.slug, p]));
  const discounts = await getLiveDiscounts();
  return slugs
    .map((s) => bySlug.get(s))
    .filter((p): p is ProductRow => Boolean(p))
    .map((p) => toCard(p, discounts));
}

/**
 * Products matching the given ids, preserving id order (missing skipped). Used
 * by the wishlist, which stores ids rather than slugs.
 */
export async function getProductsByIds(
  ids: string[],
  version: SiteVersion,
): Promise<ProductCard[]> {
  if (ids.length === 0) return [];
  const rows = (await db.product.findMany({
    where: { ...shownWhere(version), id: { in: ids } },
    include,
  })) as ProductRow[];
  const byId = new Map(rows.map((p) => [p.id, p]));
  const discounts = await getLiveDiscounts();
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is ProductRow => Boolean(p))
    .map((p) => toCard(p, discounts));
}

/**
 * Lightweight product list for pickers outside the catalog UI (the ambassador
 * application's "product you would promote" select), following the store's
 * show flag.
 */
export async function getProductPickerOptions(
  version: SiteVersion,
): Promise<{ name: string; brand: string }[]> {
  const rows = await db.product.findMany({
    where: shownWhere(version),
    orderBy: { name: "asc" },
    select: { name: true, brand: { select: { name: true } } },
  });
  return rows.map((p) => ({ name: p.name, brand: p.brand.name }));
}

/**
 * One product by slug, regardless of either store's show flag — the product
 * page resolves the request's store and 404s when it is hidden there
 * (`visibleForVersion`).
 */
export async function getProductBySlug(
  slug: string,
): Promise<ProductDetail | null> {
  const row = (await db.product.findFirst({
    where: { slug },
    include: detailInclude,
  })) as ProductRow | null;
  if (!row) return null;
  const discounts = await getLiveDiscounts();
  return toDetail(row, discounts);
}
