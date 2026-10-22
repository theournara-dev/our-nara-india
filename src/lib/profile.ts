const join = (first: string | null, last: string | null) =>
  [first, last]
    .map((value) => (value ?? "").trim())
    .filter(Boolean)
    .join(" ");

/**
 * Keep a display name the user set themselves; follow the contact name only
 * while it is still the auto-derived first + last.
 */
export function nextUserName(
  currentName: string,
  previousFirst: string | null,
  previousLast: string | null,
  nextFirst: string,
  nextLast: string,
): string {
  const next = join(nextFirst, nextLast);
  return currentName.trim() === "" || currentName.trim() === join(previousFirst, previousLast)
    ? next
    : currentName;
}
