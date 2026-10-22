/** Whole page number inside 1..totalPages; anything else (float, text, 0) → 1. */
export function clampPage(value: string | undefined, totalPages: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return 1;
  return Math.min(parsed, Math.max(1, totalPages));
}
