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
 * Map an arbitrary Delhivery status/flow string onto our statuses. `extra`
 * may carry the scan's StatusCode + Instructions so context-sensitive scans
 * can be distinguished (see the "not received from client" close-out below).
 * Returns null for unrecognized strings — callers keep their current status
 * instead of jumping to a terminal state on unknown provider wording
 * (Delhivery's status vocabulary varies by surface; e.g. "Undelivered" NDR
 * scans must NOT match the generic "deliver" check).
 */
export function mapDelhiveryStatus(
  raw: string | null | undefined,
  extra?: string | null,
): ShipmentStatusValue | null {
  if (!raw) return null;
  const s = `${raw} ${extra ?? ""}`.trim().toLowerCase();
  // Pre-pickup cancellation, surfaced by the legacy API as a close-out scan:
  // "Not Picked" (X-PNP) + instruction "Shipment not received from client".
  // This is what an admin cancellation in the Delhivery One dashboard
  // produces — the API has no "Cancelled" scan for forward shipments. MUST
  // run before the generic pickup rules, since a bare "Not Picked" without
  // this instruction is merely awaiting pickup, NOT a cancel.
  if (s.includes("shipment not received from client")) return "CANCELLED";
  if (s.includes("undeliver") || s.includes("not reachable")) return "FAILED";
  if (s.includes("rto") || s.includes("return")) return "RTO";
  if (s.includes("cancel")) return "CANCELLED";
  if (s.includes("delivered") || s.includes("complete")) return "DELIVERED";
  // Manifested but the courier hasn't physically picked the parcel up yet —
  // the normal awaiting-pickup state (kept distinct from the close-out above).
  if (s.includes("not picked")) return "PICKUP_SCHEDULED";
  if (s.includes("manifest") || s.includes("pickup")) return "PICKUP_SCHEDULED";
  if (
    s.includes("transit") ||
    s.includes("dispatch") ||
    s.includes("flight")
  ) {
    return "IN_TRANSIT";
  }
  if (s.includes("pending") || s.includes("created")) return "CREATED";
  // Log unrecognized vocabulary so the mapping table can be extended —
  // silent misses would make shipments appear stuck (they keep their current
  // status via the forward-only guard).
  console.warn(`[delhivery] Unrecognized provider status: "${raw}"`);
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

/** Per-request timeout: one slow call must not eat the cron's 60s budget. */
const REQUEST_TIMEOUT_MS = 15_000;

async function request<T>(
  path: string,
  init: {
    method?: "GET" | "POST";
    body?: string;
    /** Override the request content type. Defaults to application/json. */
    contentType?: string;
  } = {},
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${baseUrl()}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": init.contentType ?? "application/json",
      Accept: "application/json",
    },
    body: init.body,
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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

  // Delhivery's legacy B2C surface does NOT read `format` from a JSON body —
  // it requires a top-level form-encoded `format=json&data=<url-encoded JSON>`
  // payload (the official FAQ calls this out explicitly; sending it inside the
  // JSON body fails with "format key missing in POST"). `pickup_location` must
  // be an OBJECT {"name": ...} — a bare string makes Delhivery's handler crash
  // with "str object has no attribute 'get'". `shipments` lives inside `data`.
  const payload = encodeURIComponent(
    JSON.stringify({
      pickup_location: { name: pickup },
      shipments: [shipment],
    }),
  );

  const res = await request<{
    success?: boolean;
    error?: boolean;
    rmk?: string;
    packages?: { waybill?: string; status?: string; remarks?: string }[];
    wbn?: string;
    packages_assigned?: { waybill?: string }[];
  }>("/api/cmu/create.json", {
    method: "POST",
    contentType: "application/x-www-form-urlencoded",
    body: `format=json&data=${payload}`,
  });

  // Delhivery reports failures as HTTP 200 with success:false (or a per-package
  // "Fail" status) — and its catch-all `rmk` ("An internal Error has occurred…")
  // is deliberately generic. The REAL exception always arrives in
  // `packages[].remarks` (e.g. "Crashing while saving package due to exception
  // '…non serviceable pincode'", wallet balance, duplicate order ref). Prefer
  // package remarks over rmk so the actual cause reaches the user; rmk is only
  // quoted when the API returns no per-package detail.
  const failedPackage = res.packages?.find(
    (p) => p.status === "Fail" || !p.waybill,
  );
  if (res.success === false || res.error === true || failedPackage) {
    const detail =
      failedPackage?.remarks ??
      res.packages?.[0]?.remarks ??
      res.rmk ??
      "unknown error";
    throw new DelhiveryError(
      `Delhivery rejected the shipment: ${detail}`,
    );
  }

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
          Status?: {
            Status?: string;
            StatusCode?: string;
            Instructions?: string;
            StatusDateTime?: string;
          };
        };
      }[];
    }>("/api/v1/packages/json/?waybill=" + encodeURIComponent(waybill));

    const s = res.ShipmentData?.[0]?.Shipment;
    if (!s) return null;

    // Include StatusCode + Instructions so context-sensitive scans like the
    // pre-pickup cancel close-out ("Not Picked" / X-PNP / "Shipment not
    // received from client") can be recognized as such.
    const status = mapDelhiveryStatus(
      s.Status?.Status,
      `${s.Status?.StatusCode ?? ""} ${s.Status?.Instructions ?? ""}`,
    ) ?? "CREATED";

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

/** Public tracking URL — open this from the admin for the full history. */
export function trackingUrl(waybill: string): string {
  return `https://www.delhivery.com/track-v2/package/${encodeURIComponent(waybill)}`;
}