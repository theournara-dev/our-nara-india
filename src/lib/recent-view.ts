/**
 * Tracks recently viewed products for the current session (sessionStorage),
 * most recent first. Client-only — all reads/writes guard against SSR.
 */

const STORAGE_KEY = "ournara:recent-views";
const MAX = 12;

/** Recently viewed product slugs, most recent first. */
export function getRecentViewIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/** Record a product view, moving it to the front and de-duplicating. */
export function addRecentView(slug: string): void {
  if (typeof window === "undefined" || !slug) return;
  try {
    const ids = getRecentViewIds().filter((s) => s !== slug);
    ids.unshift(slug);
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX)));
  } catch {
    // ignore storage errors
  }
}
