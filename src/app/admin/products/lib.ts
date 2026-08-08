/** Query params that make up the products list's filter state. */
export const FILTER_KEYS = [
  "search",
  "brand",
  "category",
  "active",
  "page",
] as const;

/**
 * Build a `/admin/products` URL that preserves the current list filters, so the
 * user returns to the same page/filters after creating or editing a product.
 */
export function buildBackHref(
  params: Record<string, string | undefined>,
): string {
  const sp = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const v = params[key];
    if (v) sp.set(key, v);
  }
  const qs = sp.toString();
  return `/admin/products${qs ? `?${qs}` : ""}`;
}

/** The current filter query string for the given filter values. */
export function currentQuery(params: Record<string, string>): string {
  return buildBackHref(params).replace(/^\/admin\/products/, "");
}
