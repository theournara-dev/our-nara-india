export type OrderAccountKey = { userId: string | null; email: string };

/** A guest order (no userId) belongs to the account whose email matches. */
export function orderBelongsToUser(
  order: OrderAccountKey,
  user: { id: string; email: string },
): boolean {
  return (
    order.userId === user.id ||
    (order.userId === null && order.email.toLowerCase() === user.email.toLowerCase())
  );
}

export function orderAccountWhere(user: { id: string; email: string }) {
  return { OR: [{ userId: user.id }, { email: user.email.toLowerCase() }] };
}
