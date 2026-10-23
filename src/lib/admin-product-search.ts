/** Page size for the admin product picker; small enough to keep each response light. */
export const ADMIN_PRODUCT_PAGE_SIZE = 40;

export const ADMIN_PRODUCT_MAX_PAGE_SIZE = 100;

/** Selected slugs resolved per request; keeps the query string short. */
export const ADMIN_PRODUCT_SELECTED_LIMIT = 200;

const MAX_TERM_LENGTH = 200;

function text(value: string | null): string {
  return (value ?? "").trim().slice(0, MAX_TERM_LENGTH);
}

function positiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return parsed;
}

/**
 * Parses the admin product search query. Every field is optional; page and
 * pageSize are clamped so a hand-written URL cannot ask for a huge payload.
 */
export function parseProductSearchParams(searchParams: URLSearchParams): {
  q: string;
  brand: string;
  category: string;
  page: number;
  pageSize: number;
} {
  return {
    q: text(searchParams.get("q")),
    brand: text(searchParams.get("brand")),
    category: text(searchParams.get("category")),
    page: positiveInt(searchParams.get("page"), 1),
    pageSize: Math.min(
      ADMIN_PRODUCT_MAX_PAGE_SIZE,
      positiveInt(searchParams.get("pageSize"), ADMIN_PRODUCT_PAGE_SIZE),
    ),
  };
}

/**
 * Selected slugs come back from the form as a comma-separated list so the
 * picker can label choices that are not on the current result page.
 *
 * shortcut: at most 200 selected slugs are resolved per search request. A
 * section with more picks falls back to showing the raw slug; switch this
 * endpoint to POST if such lists become real.
 */
export function parseSelectedSlugs(value: string | null): string[] {
  if (!value) return [];
  const slugs: string[] = [];
  const seen = new Set<string>();
  for (const part of value.split(",")) {
    const slug = part.trim().slice(0, MAX_TERM_LENGTH);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    slugs.push(slug);
    if (slugs.length >= ADMIN_PRODUCT_SELECTED_LIMIT) break;
  }
  return slugs;
}
