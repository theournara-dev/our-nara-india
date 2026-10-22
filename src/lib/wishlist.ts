export function withSaved(ids: string[], productId: string, saved: boolean): string[] {
  if (!saved) return ids.filter((id) => id !== productId);
  return ids.includes(productId) ? ids : [...ids, productId];
}
