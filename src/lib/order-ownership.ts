export type OrderAccountKey = { userId: string | null; email: string };

export type OrderAccountUser = {
  id: string;
  email: string;
  emailVerified: boolean;
};

/**
 * A guest order (no userId) belongs to the account whose email matches — but
 * only once that address is verified. Without verification anyone could
 * register a guest customer's email and inherit their order history.
 */
export function orderBelongsToUser(
  order: OrderAccountKey,
  user: OrderAccountUser,
): boolean {
  return (
    order.userId === user.id ||
    (user.emailVerified &&
      order.userId === null &&
      order.email.toLowerCase() === user.email.toLowerCase())
  );
}

export function orderAccountWhere(user: OrderAccountUser) {
  // The email branch only covers guest orders. Without `userId: null` a
  // signed-in order using this email (someone else's account) would leak here.
  if (!user.emailVerified) return { userId: user.id };
  return {
    OR: [
      { userId: user.id },
      { userId: null, email: user.email.toLowerCase() },
    ],
  };
}
