/**
 * Pure product-discount resolver.
 *
 * Every storefront surface (product page, cart, checkout) reads its price
 * through `resolvePrice`, so one discount per unit is chosen the same way
 * everywhere: highest amount, then most specific scope, then newest, then id.
 * No I/O and no Prisma imports — callers pass the candidate rows in.
 */

import { formatMoney } from "@/lib/money";
import type { SiteVersion } from "@/lib/site-version";

export type DiscountType = "PERCENT" | "FIXED";
export type DiscountScope = "ALL" | "BRAND" | "CATEGORY" | "PRODUCT";
export type DiscountStatus =
  | "active"
  | "paused"
  | "scheduled"
  | "expired"
  | "deleted";

export interface DiscountRecord {
  id: string;
  title: string;
  type: DiscountType;
  value: number;
  scope: DiscountScope;
  brandId: string | null;
  categoryId: string | null;
  productId: string | null;
  siteVersion: "all" | "local" | "global";
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  deletedAt: Date | null;
  createdAt: Date;
}

export interface DiscountTarget {
  productId: string;
  brandId: string;
  categoryIds: string[];
}

export interface DiscountOption {
  discount: DiscountRecord;
  amountCents: number;
}

export interface ResolvedPrice {
  listCents: number;
  chargedCents: number;
  applied: DiscountRecord | null;
  amountCents: number;
  options: DiscountOption[];
}

/** What a product card shows when a discount applies to its store. */
export interface DiscountBadge {
  title: string;
  amountCents: number;
  percentOff: number | null;
}

const SCOPE_RANK: Record<DiscountScope, number> = {
  ALL: 0,
  BRAND: 1,
  CATEGORY: 2,
  PRODUCT: 3,
};

/** Soft-delete and pause beat the window: a deleted row is never "scheduled". */
export function discountStatus(
  record: Pick<DiscountRecord, "deletedAt" | "isActive" | "startsAt" | "endsAt">,
  now: Date = new Date(),
): DiscountStatus {
  if (record.deletedAt) return "deleted";
  if (!record.isActive) return "paused";
  if (record.startsAt && record.startsAt > now) return "scheduled";
  if (record.endsAt && record.endsAt < now) return "expired";
  return "active";
}

export function isDiscountLive(
  record: DiscountRecord,
  version: SiteVersion,
  now: Date = new Date(),
): boolean {
  return (
    discountStatus(record, now) === "active" &&
    (record.siteVersion === "all" || record.siteVersion === version)
  );
}

function matchesTarget(record: DiscountRecord, target: DiscountTarget): boolean {
  switch (record.scope) {
    case "ALL":
      return true;
    case "BRAND":
      return record.brandId !== null && record.brandId === target.brandId;
    case "CATEGORY":
      return (
        record.categoryId !== null &&
        target.categoryIds.includes(record.categoryId)
      );
    case "PRODUCT":
      return record.productId !== null && record.productId === target.productId;
  }
}

function amountFor(record: DiscountRecord, listCents: number): number {
  const amount =
    record.type === "PERCENT"
      ? Math.round((listCents * record.value) / 100)
      : Math.min(record.value, listCents);
  return amount >= 1 ? amount : 0;
}

export function resolvePrice(
  listCents: number,
  target: DiscountTarget,
  discounts: DiscountRecord[],
  version: SiteVersion,
  now: Date = new Date(),
): ResolvedPrice {
  const list = Math.max(0, listCents);

  const options = discounts
    .filter(
      (discount) =>
        isDiscountLive(discount, version, now) &&
        matchesTarget(discount, target),
    )
    .map((discount) => ({ discount, amountCents: amountFor(discount, list) }))
    .filter((option) => option.amountCents >= 1)
    .sort(
      (a, b) =>
        b.amountCents - a.amountCents ||
        SCOPE_RANK[b.discount.scope] - SCOPE_RANK[a.discount.scope] ||
        b.discount.createdAt.getTime() - a.discount.createdAt.getTime() ||
        (a.discount.id < b.discount.id ? -1 : a.discount.id > b.discount.id ? 1 : 0),
    );

  const best = options[0];
  const amountCents = best?.amountCents ?? 0;

  return {
    listCents: list,
    chargedCents: Math.max(0, list - amountCents),
    applied: best?.discount ?? null,
    amountCents,
    options,
  };
}

/** Collect every category id a product belongs to, primary first, deduped. */
export function discountTargetFor(input: {
  productId: string;
  brandId: string;
  categoryId: string;
  categoryParentId?: string | null;
  subcategories?: { category: { id: string; parentId: string | null } }[];
}): DiscountTarget {
  const categoryIds: string[] = [];
  const add = (id: string | null | undefined) => {
    if (id && !categoryIds.includes(id)) categoryIds.push(id);
  };

  add(input.categoryId);
  add(input.categoryParentId);
  for (const { category } of input.subcategories ?? []) {
    add(category.id);
    add(category.parentId);
  }

  return { productId: input.productId, brandId: input.brandId, categoryIds };
}

/** The card badge for a resolved price, or null when nothing applied. */
export function discountBadge(resolved: ResolvedPrice): DiscountBadge | null {
  const applied = resolved.applied;
  return applied
    ? {
        title: applied.title,
        amountCents: resolved.amountCents,
        percentOff: applied.type === "PERCENT" ? applied.value : null,
      }
    : null;
}

export function discountBadgeLabel(badge: DiscountBadge, currency: string): string {
  return badge.percentOff != null
    ? `−${badge.percentOff}%`
    : `−${formatMoney(badge.amountCents, currency)}`;
}
