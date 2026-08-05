import { unstable_cache } from "next/cache";

/**
 * Thin wrapper around Next's `unstable_cache` (still the supported ISR
 * primitive in this version) with a stable signature so the data layer reads
 * cleanly:
 *
 *   const featured = await getFeaturedProducts(8)
 *
 * All catalog reads go through this so product edits can invalidate them with
 * `revalidateTag("products")` later without touching every page.
 *
 * @param fn      async data accessor (arguments must be JSON-serializable)
 * @param keyParts stable extra cache-key parts (e.g. the slug being looked up)
 * @param tags    cache tags for on-demand invalidation
 * @param revalidateSeconds stale window; `false` keeps it until invalidated
 */
export function cacheData<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyParts: string[],
  tags: string[],
  revalidateSeconds: number | false,
) {
  return unstable_cache(fn, keyParts, { tags, revalidate: revalidateSeconds });
}
