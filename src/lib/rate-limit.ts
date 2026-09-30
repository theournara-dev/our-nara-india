/**
 * Best-effort in-memory rate limiter, keyed by an arbitrary string (usually the
 * client IP). It resets on server restart and is per-instance on serverless, so
 * it blunts casual spam rather than acting as a security boundary — swap for a
 * shared store (e.g. Redis) if stronger guarantees are needed.
 */

interface Bucket {
  hits: number[];
}

export interface RateLimiter {
  /** Record a hit for `key`. Returns true when the key is now over the limit. */
  check(key: string): boolean;
  /** Current number of in-window hits for `key` (does not record one). */
  count(key: string): number;
  /** Drop expired buckets; called opportunistically on `check`. */
  prune(now?: number): void;
}

/**
 * Create a limiter allowing `max` hits per `windowMs` per key.
 *
 * @example
 *   const limiter = createRateLimiter(3, 10 * 60 * 1000); // 3 per 10 min
 *   if (limiter.check(ip)) return { ok: false, error: "Too many requests" };
 */
export function createRateLimiter(max: number, windowMs: number): RateLimiter {
  const buckets = new Map<string, Bucket>();

  function prune(now = Date.now()) {
    for (const [key, bucket] of buckets) {
      const recent = bucket.hits.filter((t) => now - t < windowMs);
      if (recent.length === 0) buckets.delete(key);
      else bucket.hits = recent;
    }
  }

  return {
    check(key: string): boolean {
      const now = Date.now();
      const recent = (buckets.get(key)?.hits ?? []).filter(
        (t) => now - t < windowMs,
      );
      if (recent.length >= max) {
        buckets.set(key, { hits: recent });
        return true;
      }
      recent.push(now);
      buckets.set(key, { hits: recent });
      // Opportunistic cleanup so the map can't grow unbounded.
      if (buckets.size > 1000) prune(now);
      return false;
    },
    count(key: string): number {
      const now = Date.now();
      return (buckets.get(key)?.hits ?? []).filter(
        (t) => now - t < windowMs,
      ).length;
    },
    prune,
  };
}
