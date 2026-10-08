/**
 * URLs and display values for the /stores page. Pure (no server-only imports)
 * so the unit test can run under node:test.
 */

/** The map location, or the store address when the admin left it empty. */
export function resolveStoreMapQuery(
  mapLocation: string,
  address: string,
): string {
  return mapLocation.trim() || address.trim();
}

/** Embeddable Google Maps view of a location. */
export function storeMapEmbedUrl(query: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

/** Opens a location in Google Maps (used by the "Open in Maps" link). */
export function storeMapOpenUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** An empty detail shows a dash, as the original does for a blank address. */
export function storeDetailValue(value: string): string {
  return value.trim() || "-";
}
