import "server-only";

/**
 * Delhivery B2C shipping client. Mirrors the `lib/razorpay.ts` pattern:
 * server-only, lazily configured from env, integer money units, typed results.
 *
 * This is the *fulfillment* side of the pipeline: after Razorpay marks an
 * order PAID, the admin creates a Delhivery shipment (waybill + label), the
 * courier moves it, and status flows back via pulls — the admin "Sync"
 * button on demand, plus the once-daily cron that sweeps every non-terminal
 * shipment.
 *
 * Env vars:
 *  - DELHIVERY_API_TOKEN      : API token from the One Delhivery panel (required)
 *  - DELHIVERY_BASE_URL       : API surface. Defaults to
 *                               "https://track.delhivery.com" (legacy B2C surface);
 *                               switch to the One B2C URL when the account manager
 *                               confirms it.
 *  - DELHIVERY_PICKUP_LOCATION: name of the registered warehouse/pickup location
 *                               exactly as configured in the Delhivery panel.
 *
 * All amounts are integer minor units (paise) — same convention as Razorpay.
 * COD is out of scope: every shipment is prepaid (cod_amount = 0).
 */

export const DEFAULT_PRODUCT_WEIGHT_GRAMS = 500;

const DEFAULT_BASE_URL = "https://track.delhivery.com";

export class DelhiveryError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "DelhiveryError";
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new DelhiveryError(`Missing required environment variable: ${name}`);
  }
  return value;
}

function baseUrl(): string {
  return (process.env.DELHIVERY_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
}

export function getToken(): string {
  return requireEnv("DELHIVERY_API_TOKEN");
}

export function isConfigured(): boolean {
  return Boolean(process.env.DELHIVERY_API_TOKEN);
}

export function pickupLocation(): string | null {
  return process.env.DELHIVERY_PICKUP_LOCATION ?? null;
}

/** Delhivery tracks statuses loosely; map them onto our ShipmentStatus enum. */
export type ShipmentStatusValue =
  | "CREATED"
  | "PICKUP_SCHEDULED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "RTO"
  | "CANCELLED"
  | "FAILED";

/**
 * Map an arbitrary Delhivery status/flow string onto our statuses.
 * Returns null for unrecognized strings — callers keep their current status
 * instead of jumping to a terminal state on unknown provider wording
 * (Delhivery's status vocabulary varies by surface; e.g. "Undelivered" NDR
 * scans must NOT match the generic "deliver" check).
 */
export function mapDelhiveryStatus(
  raw: string | null | undefined,
): ShipmentStatusValue | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (s.includes("undeliver") || s.includes("not reachable")) return "FAILED";
  if (s.includes("rto") || s.includes("return")) return "RTO";
  if (s.includes("cancel")) return "CANCELLED";
  if (s.includes("delivered") || s.includes("complete")) return "DELIVERED";
  if (s.includes("manifest") || s.includes("pickup")) return "PICKUP_SCHEDULED";
  if (
    s.includes("transit") ||
    s.includes("dispatch") ||
    s.includes("flight")
  ) {
    return "IN_TRANSIT";
  }
  if (s.includes("pending") || s.includes("created")) return "CREATED";
  return null;
}

export interface DelhiveryShipment {
  waybill: string;
  status: ShipmentStatusValue;
  providerStatus: string | null;
  labelUrl: string | null;
  lastEventAt: Date | null;
}

// ---------------------------------------------------------------------------
// Low-level request helper
// ---------------------------------------------------------------------------

async function request<T>(
  path: string,
  init: { method?: "GET" | "POST"; body?: string } = {},
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${baseUrl()}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: init.body,
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    throw new DelhiveryError(
      `Delhivery ${path} failed (${res.status}): ${text.slice(0, 300)}`,
      res.status,
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new DelhiveryError(
      `Delhivery ${path} returned non-JSON: ${text.slice(0, 200)}`,
      res.status,
    );
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface CreateShipmentParams {
  /** Our internal Order.orderNumber — sent as the waybill's client reference. */
  orderNumber: string;
  customerName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state?: string | null;
  postal: string;
  /** Declared value in paise (order total). */
  amountCents: number;
  /** Total parcel weight in grams. */
  weightGrams: number;
}

export interface CreateShipmentResult {
  waybill: string;
  labelUrl: string | null;
}

/**
 * Create a prepaid shipment for an order. Synchronous manifest: Delhivery
 * allocates the waybill in the create response.
 */
export async function createShipment(
  params: CreateShipmentParams,
): Promise<CreateShipmentResult> {
  const pickup = pickupLocation();
  if (!pickup) {
    throw new DelhiveryError(
      "Missing DELHIVERY_PICKUP_LOCATION env var (warehouse name from the Delhivery panel).",
    );
  }

  const shipment = {
    name: params.customerName,
    add: params.addressLine1,
    ...(params.addressLine2 ? { add2: params.addressLine2 } : {}),
    city: params.city,
    state: params.state ?? "",
    pin: params.postal,
    phone: params.phone,
    order: params.orderNumber, // our reference, echoed on events
    payment_mode: "Prepaid",
    cod_amount: 0, // prepaid only — Razorpay collects upfront
    total_amount: Math.round(params.amountCents / 100), // Delhivery wants rupees
    quantity: 1,
    weight: params.weightGrams, // grams
  };

  const body = {
    format: "json",
    pickup_location: pickup,
    shipments: [shipment],
  };

  const res = await request<{
    packages?: { waybill?: string; ref_id?: string }[];
    wbn?: string;
    packages_assigned?: { waybill?: string }[];
  }>("/api/cmu/create.json", {
    method: "POST",
    body: JSON.stringify(body),
  });

  // The create response may nest the allocated waybill in several spots
  // depending on API surface version; check all of them.
  const waybill =
    res.wbn ??
    res.packages?.[0]?.waybill ??
    res.packages_assigned?.[0]?.waybill;

  if (!waybill) {
    throw new DelhiveryError(
      "Delhivery did not return a waybill in the create response.",
    );
  }

  return {
    waybill,
    labelUrl: `${baseUrl()}/api/p/packing_slip?wbns=${waybill}`,
  };
}

/** Fetch current shipment state (used by sync + import-by-waybill). */
export async function fetchShipment(
  waybill: string,
): Promise<DelhiveryShipment | null> {
  try {
    const res = await request<{
      ShipmentData?: {
        Shipment?: {
          AWB?: string;
          Status?: { Status?: string; StatusDateTime?: string };
        };
      }[];
    }>("/api/v1/packages/json/?waybill=" + encodeURIComponent(waybill));

    const s = res.ShipmentData?.[0]?.Shipment;
    if (!s) return null;

    const status = mapDelhiveryStatus(s.Status?.Status) ?? "CREATED";

    return {
      waybill: s.AWB ?? waybill,
      status,
      providerStatus: s.Status?.Status ?? null,
      labelUrl: null,
      lastEventAt: s.Status?.StatusDateTime
        ? new Date(s.Status.StatusDateTime)
        : null,
    };
  } catch (err) {
    if (err instanceof DelhiveryError && err.status === 404) return null;
    throw err;
  }
}

/** Request a pickup for a manifested shipment (or all ready-to-pick today). */
export async function schedulePickup(): Promise<{ ok: boolean; message?: string }> {
  // On the legacy surface pickups are scheduled via the dashboard or the
  // parent pickup-request endpoint; a missing warehouse config is the common
  // failure, so surface it clearly.
  const pickup = pickupLocation();
  if (!pickup) {
    throw new DelhiveryError("Missing DELHIVERY_PICKUP_LOCATION env var.");
  }
  const res = await request<{ success?: boolean; message?: string }>(
    "/api/mu/requests/create.json",
    {
      method: "POST",
      body: JSON.stringify({ pickup_location: pickup, request_auto: true }),
    },
  );
  return { ok: Boolean(res.success), message: res.message };
}

/** Cancel a pre-dispatch shipment; post-dispatch must be RTO from the panel. */
export async function cancelShipment(waybill: string): Promise<void> {
  await request("/api/p/edit", {
    method: "POST",
    body: JSON.stringify({
      waybill,
      cancellation: "yes",
    }),
  });
}

/** Public tracking URL — open this from the admin for the full history. */
export function trackingUrl(waybill: string): string {
  return `https://track.delhivery.com/tracking/${encodeURIComponent(waybill)}`;
}