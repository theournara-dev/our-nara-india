import { notify } from "@/lib/toast";

/** Human-friendly copy used whenever the server rate-limits a request (HTTP 429). */
export const RATE_LIMIT_MESSAGE = "Please wait a minute and try again.";

/**
 * True when an auth client error is an HTTP 429. Accepts both the BetterFetch
 * error shape (`{ status }`) returned by `authClient.signIn/signUp` and a plain
 * object with a numeric `status`.
 */
export function isRateLimit(
  err: { status?: number } | null | undefined,
): err is { status: 429 } {
  return err?.status === 429;
}

/** Reports a rate-limited action via a toast, replacing the toast with `id`. */
export function notifyRateLimit(
  id: string | number,
  message: string = "Too many attempts",
) {
  notify.error(id, message, RATE_LIMIT_MESSAGE);
}
