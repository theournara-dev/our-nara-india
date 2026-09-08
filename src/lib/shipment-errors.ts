/**
 * Map raw shipment/Delhivery errors to short, human-friendly explanations
 * with a suggested next step. Unknown errors fall back to a generic message —
 * admins should never see raw Delhivery API responses or stack traces.
 */

const SHIPMENT_MESSAGES: { match: RegExp; title: string; hint: string }[] = [
  {
    match: /missing a valid 6-digit indian postal code/i,
    title: "Check the shipping address",
    hint: "This order is missing a valid 6-digit Indian postal code. Add it to the order before creating a shipment.",
  },
  {
    match: /missing a phone number/i,
    title: "Check the shipping address",
    hint: "This order is missing a phone number. Add it to the order before creating a shipment.",
  },
  {
    match: /already has an active shipment/i,
    title: "Shipment already exists",
    hint: "This order already has an active shipment. Refresh the list to see it.",
  },
  {
    match: /waybill not found at delhivery/i,
    title: "Waybill not found",
    hint: "Delhivery has no record of that waybill. Double-check the number and try again.",
  },
  {
    match: /waybill is required/i,
    title: "Waybill required",
    hint: "Enter the waybill number before attaching it.",
  },
  {
    match: /shipment not found/i,
    title: "Shipment not found",
    hint: "That shipment no longer exists. Refresh the list and try again.",
  },
  {
    match: /did not return a waybill/i,
    title: "Delhivery didn't return a waybill",
    hint: "The shipment wasn't created. Please try again — if it keeps happening, contact support.",
  },
  {
    match: /rejected the shipment/i,
    title: "Delhivery rejected the shipment",
    hint: "Delhivery couldn't accept the shipment. Check the order's address and details, then try again.",
  },
  {
    match: /pickup_location|pickup location/i,
    title: "Warehouse not configured",
    hint: "The Delhivery pickup location isn't set up. Contact the site admin.",
  },
  {
    match: /missing required environment variable/i,
    title: "Shipping not configured",
    hint: "The Delhivery API token is missing. Contact the site admin.",
  },
  {
    match: /did not confirm the pickup/i,
    title: "Pickup not confirmed",
    hint: "Delhivery didn't confirm the pickup. Try again, or schedule it from the Delhivery panel.",
  },
  {
    match: /returned non-json/i,
    title: "Delhivery responded unexpectedly",
    hint: "Delhivery returned an unreadable response. Please try again in a moment.",
  },
  {
    match: /timed out|timeout|abort/i,
    title: "Request timed out",
    hint: "Delhivery took too long to respond. Please try again.",
  },
  {
    match: /fetch failed|failed to fetch|econnrefused|econnreset|enotfound|network/i,
    title: "Connection problem",
    hint: "Couldn't reach Delhivery. Check your internet connection and try again.",
  },
  {
    match: /unauthorized/i,
    title: "Session expired",
    hint: "Your admin session expired. Sign in again and retry.",
  },
  {
    match: /too many|rate limit|429/i,
    title: "Too many attempts",
    hint: "Please wait a minute and try again.",
  },
  {
    match: /order not found/i,
    title: "Order not found",
    hint: "This order no longer exists. Refresh the list.",
  },
  {
    match: /invalid order status/i,
    title: "Invalid status",
    hint: "That status isn't allowed. Refresh and try again.",
  },
];

/** Delhivery API rejections embed the HTTP status in the message. */
const DELHIVERY_FAILURE = /delhivery .* failed \((\d+)\)/i;

/**
 * Common, well-understood Delhivery rejection reasons. These ship as the
 * suffix of `Delhivery rejected the shipment: <reason>` errors, so they can
 * be explained instead of shown raw.
 */
const KNOWN_REASONS: { match: RegExp; title: string; hint: string }[] = [
  {
    match:
      /clientwarehouse|warehouse.*(doesn't exist|does not exist|not exist)|pickup.location.*(doesn't exist|does not exist|not exist)/i,
    title: "Pickup location not found",
    hint: "The warehouse name in the settings doesn't match a registered Delhivery pickup location — the name is case-sensitive. Check DELHIVERY_PICKUP_LOCATION against the Delhivery panel.",
  },
  {
    match: /duplicate order|order.*(already exists|already created|exist)/i,
    title: "Duplicate shipment",
    hint: "Delhivery already has a shipment for this order reference. Refresh the order — a previous attempt may have succeeded.",
  },
  {
    match: /pincode|pin code|postal|serviceab/i,
    title: "Pincode not serviceable",
    hint: "This delivery pincode isn't serviceable by Delhivery. Verify the order's postal code.",
  },
  {
    match: /client is not active|not active|inactive/i,
    title: "Delhivery account issue",
    hint: "The Delhivery client account isn't active. Contact Delhivery support.",
  },
  {
    match: /balance|wallet/i,
    title: "Delhivery account balance",
    hint: "Delhivery may need funds or a valid payment method on the account. Check the Delhivery panel.",
  },
  {
    // Delhivery's catch-all wrapper when its handler throws an unhandled
    // exception — most often a duplicate/reused order reference (Q10), a
    // non-serviceable pincode, or a wallet balance issue. These come back
    // inside packages[].remarks when present; this covers the bare message.
    match: /internal error|client\.support|tech\.admin@delhivery/i,
    title: "Delhivery had a problem",
    hint: "Delhivery couldn't create the shipment on its side. This usually means the delivery pincode isn't serviceable, the order reference was already used, or the account needs a wallet top-up. Check the Delhivery panel, or try again after a few minutes.",
  },
];

export interface FriendlyShipmentError {
  title: string;
  hint: string;
}

/** Translate any thrown shipment error into admin-friendly copy. */
export function friendlyShipmentError(err: unknown): FriendlyShipmentError {
  const message =
    err instanceof Error ? err.message : String(err ?? "Unknown error");

  // A waybill was created at Delhivery but the local save failed — the
  // original message is already clear and actionable, so pass it through.
  if (/saving it failed/i.test(message)) {
    return {
      title: "Shipment created — import it",
      hint: message,
    };
  }

  // Tailor the hint to whether Delhivery rejected the request (4xx) or had a
  // server problem (5xx). Delhivery also reports rejections as HTTP 200 with
  // success:false — those arrive as "Delhivery rejected the shipment: <detail>".
  const statusMatch = message.match(DELHIVERY_FAILURE);
  if (statusMatch) {
    const status = Number(statusMatch[1]);
    if (status >= 500) {
      return {
        title: "Delhivery is having trouble",
        hint: "Delhivery's server returned an error. Please try again in a few minutes.",
      };
    }
    return {
      title: "Delhivery rejected the shipment",
      hint: "Delhivery couldn't accept the shipment. Check the order's address and details, then try again.",
    };
  }

  // "Delhivery rejected the shipment: <reason>" — surface a plain-language
  // explanation for known reasons; otherwise quote the reason so support can
  // act instead of seeing a guess.
  const rejectedMatch = message.match(/^delhivery rejected the shipment: (.+)$/i);
  if (rejectedMatch) {
    const reason = rejectedMatch[1] ?? "unknown error";
    for (const r of KNOWN_REASONS) {
      if (r.match.test(reason)) {
        return { title: r.title, hint: r.hint };
      }
    }
    if (reason !== "unknown error") {
      return {
        title: "Delhivery rejected the shipment",
        hint: `Delhivery wouldn't create the shipment: “${reason}”.`,
      };
    }
    return {
      title: "Delhivery rejected the shipment",
      hint: "Delhivery couldn't accept the shipment. Please try again, or contact support if it keeps happening.",
    };
  }

  for (const m of SHIPMENT_MESSAGES) {
    if (m.match.test(message)) {
      return { title: m.title, hint: m.hint };
    }
  }
  return {
    title: "Shipment failed",
    hint: "Something went wrong while creating the shipment. Please try again, or contact support if it keeps happening.",
  };
}
