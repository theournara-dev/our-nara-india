/**
 * Letter grouping for the BRAND page. Pure (no database or DOM access) so the
 * bucketing and ordering rules can be unit tested directly.
 */

/** Index entries in display order: "#" for digits and symbols, then A–Z. */
export const BRAND_INDEX_KEYS = [
  "#",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
] as const;

export type BrandIndexKey = (typeof BRAND_INDEX_KEYS)[number];

export interface BrandIndexGroup<T> {
  key: BrandIndexKey;
  brands: T[];
}

// Whitespace and punctuation are skipped so "[LAB] Brand" files under L.
const LEADING_NOISE = /^[\s\p{P}]+/u;
const LETTER = /^[A-Z]$/;
const collator = new Intl.Collator("en", {
  sensitivity: "base",
  numeric: true,
});

export function brandIndexKey(name: string): BrandIndexKey {
  const [first = ""] = Array.from(name.replace(LEADING_NOISE, ""));
  const letter = first.toUpperCase();
  return LETTER.test(letter) ? (letter as BrandIndexKey) : "#";
}

/** Only non-empty groups are returned, in BRAND_INDEX_KEYS order. */
export function groupBrandsByLetter<T extends { name: string }>(
  brands: readonly T[],
): BrandIndexGroup<T>[] {
  const buckets = new Map<BrandIndexKey, T[]>();
  for (const brand of brands) {
    const key = brandIndexKey(brand.name);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(brand);
    else buckets.set(key, [brand]);
  }

  const groups: BrandIndexGroup<T>[] = [];
  for (const key of BRAND_INDEX_KEYS) {
    const bucket = buckets.get(key);
    if (!bucket) continue;
    groups.push({
      key,
      brands: bucket.sort((a, b) => collator.compare(a.name, b.name)),
    });
  }
  return groups;
}

/** Element id for a group; "#" stays literal, which is valid in a URL fragment. */
export function brandIndexAnchor(key: BrandIndexKey): string {
  return `letter-${key}`;
}
