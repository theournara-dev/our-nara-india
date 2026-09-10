/**
 * Error thrown by checkout server actions for expected, user-actionable
 * failures (validation, stock, stale prices, disabled payments). These are
 * caught inside the action and returned as structured results — never thrown
 * across the server boundary, where production Next.js would mask the message
 * with a generic digest and break the client's friendly-error mapping.
 */
export class CheckoutError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CheckoutError";
    this.code = code;
  }
}
