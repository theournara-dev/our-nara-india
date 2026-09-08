"use client";

/**
 * Client-safe re-export of Delhivery helpers that don't touch secrets
 * (tracking URLs). The real client lives in lib/delhivery (server-only).
 */

export function trackingUrl(waybill: string): string {
  return `https://www.delhivery.com/track-v2/package/${encodeURIComponent(waybill)}`;
}