import "server-only";
import { headers } from "next/headers";

/**
 * Resolve the best-effort client IP from the request headers. Behind a proxy
 * (Vercel) the real client IP is the first entry in `x-forwarded-for`. Returns
 * null when unavailable (callers should fall back to a shared bucket).
 */
export async function getClientIp(): Promise<string | null> {
  try {
    const h = await headers();
    return (
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null
    );
  } catch {
    return null;
  }
}
