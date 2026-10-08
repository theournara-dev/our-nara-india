/**
 * Store business hours. Pure so the admin editor, the stores page and the unit
 * tests all agree on the shape and the "Mon–Fri 09:00–18:00" compression.
 *
 * Storage shape (JSON column): one entry per weekday, missing = closed.
 *   { "mon": { "closed": false, "open": "09:00", "close": "18:00" }, … }
 */

export const WEEKDAYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export interface DayHours {
  closed: boolean;
  /** "HH:mm" 24-hour, as an <input type="time"> produces. */
  open: string;
  close: string;
}

export type StoreHours = Partial<Record<Weekday, DayHours>>;

export const DEFAULT_OPEN = "09:00";
export const DEFAULT_CLOSE = "18:00";

const DAY_LABEL: Record<Weekday, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

function isDayHours(value: unknown): value is DayHours {
  if (typeof value !== "object" || value == null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.closed === "boolean" &&
    typeof v.open === "string" &&
    typeof v.close === "string"
  );
}

function time(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return fallback;
  return `${String(h).padStart(2, "0")}:${match[2]}`;
}

/** Tolerant read of the JSON column; unknown days/values fall back to defaults. */
export function parseStoreHours(value: unknown): StoreHours {
  if (typeof value !== "object" || value == null) return {};
  const raw = value as Record<string, unknown>;
  const hours: StoreHours = {};
  for (const day of WEEKDAYS) {
    const entry = raw[day];
    if (!isDayHours(entry)) continue;
    hours[day] = {
      closed: entry.closed,
      open: time(entry.open, DEFAULT_OPEN),
      close: time(entry.close, DEFAULT_CLOSE),
    };
  }
  return hours;
}

/** Does this day have usable hours to show? */
export function hasAnyHours(hours: StoreHours | null | undefined): boolean {
  return WEEKDAYS.some((day) => hours?.[day] != null);
}

function sameDay(a: DayHours | undefined, b: DayHours | undefined): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return a.closed === b.closed && a.open === b.open && a.close === b.close;
}

function dayRangeLabel(days: Weekday[]): string {
  if (days.length === 1) return DAY_LABEL[days[0]];
  if (days.length === 2) return `${DAY_LABEL[days[0]]}, ${DAY_LABEL[days[1]]}`;
  return `${DAY_LABEL[days[0]]}–${DAY_LABEL[days[days.length - 1]]}`;
}

/**
 * Compress the week into display lines, e.g.
 *   ["Mon–Fri 09:00–18:00", "Sat, Sun Closed"]
 * Consecutive days with identical hours are grouped.
 */
export function storeHoursLines(
  hours: StoreHours | null | undefined,
): string[] {
  if (!hasAnyHours(hours)) return [];
  const lines: string[] = [];
  let group: Weekday[] = [];
  let current: DayHours | undefined;

  const flush = () => {
    if (group.length === 0) return;
    const label = dayRangeLabel(group);
    if (current == null || current.closed) lines.push(`${label} Closed`);
    else lines.push(`${label} ${current.open}–${current.close}`);
    group = [];
  };

  for (const day of WEEKDAYS) {
    const value = hours?.[day];
    if (group.length > 0 && sameDay(current, value)) {
      group.push(day);
      continue;
    }
    flush();
    group = [day];
    current = value;
  }
  flush();
  return lines;
}
