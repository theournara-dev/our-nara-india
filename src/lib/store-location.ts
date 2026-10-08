/**
 * Turning what an admin pastes into a map location. Pure so the admin editor's
 * "paste a Google Maps link" helper can be unit tested.
 *
 * The stored value is either "lat,lng" (most precise) or a place name/address
 * that Google Maps resolves itself — both work in the embed URL and the
 * "Open in Maps" link built by `store-map.ts`.
 */

const COORD_PAIR = /(-?\d{1,3}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/;

function validCoords(lat: string, lng: string): boolean {
  const la = Number(lat);
  const ln = Number(lng);
  return (
    Number.isFinite(la) &&
    Number.isFinite(ln) &&
    Math.abs(la) <= 90 &&
    Math.abs(ln) <= 180
  );
}

/**
 * Read a pasted Google Maps URL (or any text) into a map query:
 *   1. "!3d12.34!4d56.78"  — the pin's coordinates
 *   2. "@12.34,56.78,15z"  — the camera's coordinates
 *   3. "?q=12.34,56.78"    — an explicit query
 *   4. "/place/<Name>/"    — the place's name
 *   5. otherwise the text itself, trimmed.
 */
export function parseMapInput(input: string): string {
  const text = input.trim();
  if (!text) return "";

  const pinned = text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (pinned && validCoords(pinned[1], pinned[2])) {
    return `${pinned[1]},${pinned[2]}`;
  }

  const camera = text.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (camera && validCoords(camera[1], camera[2])) {
    return `${camera[1]},${camera[2]}`;
  }

  const query = text.match(/[?&](?:q|query|ll|center|destination)=([^&]+)/);
  if (query) {
    const decoded = safeDecode(query[1]).replace(/\+/g, " ").trim();
    const pair = decoded.match(COORD_PAIR);
    if (pair && validCoords(pair[1], pair[2])) return `${pair[1]},${pair[2]}`;
    if (decoded) return decoded;
  }

  const place = text.match(/\/place\/([^/@?]+)/);
  if (place) {
    const decoded = safeDecode(place[1]).replace(/\+/g, " ").trim();
    if (decoded) return decoded;
  }

  // A bare "12.34, 56.78" is taken as coordinates too.
  const bare = text.match(new RegExp(`^${COORD_PAIR.source}$`));
  if (bare && validCoords(bare[1], bare[2])) return `${bare[1]},${bare[2]}`;

  return text;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** True when the stored location is a coordinate pair. */
export function isCoordinateQuery(query: string): boolean {
  const match = query.trim().match(new RegExp(`^${COORD_PAIR.source}$`));
  return match != null && validCoords(match[1], match[2]);
}
