import type { CSSProperties } from "react";

/**
 * How the discount badge looks. One look for every badge on both storefronts,
 * edited from /admin/discounts and stored on the site config rows. No server
 * imports: the editor and the root layout both use this module.
 */
export type DiscountBadgeStyle = {
  background: string;
  color: string;
  fontSize: number;
  fontWeight: number;
  radius: number;
  paddingX: number;
  paddingY: number;
};

/** The badge's look before anything is saved — the original hardcoded one. */
export const DEFAULT_DISCOUNT_BADGE_STYLE: DiscountBadgeStyle = {
  background: "#6f2dbd",
  color: "#ffffff",
  fontSize: 11,
  fontWeight: 600,
  radius: 4,
  paddingX: 6,
  paddingY: 2,
};

const HEX = /^#[0-9a-f]{6}$/i;

function hex(value: unknown, fallback: string): string {
  return typeof value === "string" && HEX.test(value)
    ? value.toLowerCase()
    : fallback;
}

function integer(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function weight(value: unknown, fallback: number): number {
  const rounded =
    typeof value === "number" && Number.isFinite(value)
      ? Math.round(value / 100) * 100
      : fallback;
  return Math.min(800, Math.max(400, rounded));
}

/**
 * A stored (or hand-rolled) style, clamped per field so one bad value can't
 * break the badge: unknown colours keep the default, sizes stay in a range the
 * price row can hold.
 */
export function normalizeDiscountBadgeStyle(
  value: unknown,
): DiscountBadgeStyle {
  const raw =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const fallback = DEFAULT_DISCOUNT_BADGE_STYLE;
  return {
    background: hex(raw.background, fallback.background),
    color: hex(raw.color, fallback.color),
    fontSize: integer(raw.fontSize, 8, 24, fallback.fontSize),
    fontWeight: weight(raw.fontWeight, fallback.fontWeight),
    radius: integer(raw.radius, 0, 24, fallback.radius),
    paddingX: integer(raw.paddingX, 0, 16, fallback.paddingX),
    paddingY: integer(raw.paddingY, 0, 16, fallback.paddingY),
  };
}

/**
 * The style as CSS variables. Set on <body> by the root layout so the badge
 * class picks it up on every page, and in the admin preview so the preview
 * shows the same rule the storefront does.
 */
export function discountBadgeVars(style: DiscountBadgeStyle): CSSProperties {
  return {
    "--discount-badge-bg": style.background,
    "--discount-badge-color": style.color,
    "--discount-badge-font-size": `${style.fontSize}px`,
    "--discount-badge-font-weight": String(style.fontWeight),
    "--discount-badge-radius": `${style.radius}px`,
    "--discount-badge-pad-x": `${style.paddingX}px`,
    "--discount-badge-pad-y": `${style.paddingY}px`,
  } as CSSProperties;
}
