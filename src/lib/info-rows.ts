import type { SiteVersion } from "@/lib/site-version";

/** A single row of the INFO ("MORE INFORMATION") tab. */
export interface InfoRow {
  heading: string;
  body: string;
  /**
   * Whether this row shows on the storefront. Global-default rows are always
   * visible; per-product overrides can hide individual rows.
   */
  visible?: boolean;
}

/**
 * Which `ProductInfoTemplate` row holds a store's storewide INFO content. The
 * India row keeps the legacy `default` key — renaming it would rewrite live
 * data for cosmetics only.
 */
export const INFO_TEMPLATE_KEY: Record<SiteVersion, string> = {
  local: "default",
  global: "global",
};

/**
 * What one product's INFO tab shows on one store: its own rows (visible ones
 * only) when it has any, otherwise that store's storewide default.
 */
export function selectInfoRows(
  own: InfoRow[],
  ownGlobal: InfoRow[],
  template: InfoRow[],
  version: SiteVersion,
): InfoRow[] {
  const rows = version === "global" ? ownGlobal : own;
  return rows.length ? rows.filter((r) => r.visible !== false) : template;
}
