/**
 * Input sanitization helpers + a lightweight SQL-injection heuristic.
 *
 * Prisma issues **parameterized** queries, so SQL injection is already
 * structurally prevented at the database boundary. The heuristic here is
 * defense-in-depth: it rejects obviously malicious payloads early and surfaces
 * them in logs, catching bugs (e.g. a stray `$queryRawUnsafe`) or second-order
 * issues before they matter. It is NOT the primary control — that remains
 * Prisma's parameterization plus zod validation at each action boundary.
 *
 * These helpers are intentionally dependency-free so they can run on the
 * server and in the test runner.
 */

// C0/C1 control characters, excluding \t \n \r (kept so multiline text works).
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

/** Remove control characters that have no legitimate place in user text. */
export function stripControlChars(value: string): string {
  return value.replace(CONTROL_CHARS, "");
}

/** Collapse runs of whitespace to single spaces and trim (single-line text). */
export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Clean a single-line text field: strip control chars, turn non-breaking
 * spaces into normal spaces, collapse whitespace, and trim.
 */
export function sanitizeText(value: string): string {
  return normalizeWhitespace(stripControlChars(value).replace(/\u00A0/g, " "));
}

/**
 * Clean a multi-line text field: strip control chars and normalize line
 * endings, but preserve meaningful newlines. Collapses 3+ blank lines to one
 * blank line and trims trailing spaces on each line.
 */
export function sanitizeMultiline(value: string): string {
  return stripControlChars(value)
    .replace(/\r\n?/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * High-signal SQL-injection signatures. Deliberately conservative so ordinary
 * prose — dashes, semicolons, `#`, apostrophes, email addresses — is never
 * flagged; only combinations that have no reason to appear in real user input.
 *
 * Patterns are matched against whitespace-normalized input, so trivial
 * obfuscation (extra spaces, newlines, tabs) does not evade them.
 */
const SQL_INJECTION_PATTERNS: ReadonlyArray<{ name: string; re: RegExp }> = [
  // "union select", "union all select"
  { name: "union-select", re: /\bunion\b(?:\s+all)?\s+select\b/i },
  // "; DROP TABLE …" — a stacked statement
  {
    name: "stacked-query",
    re: /;\s*(?:drop|delete|update|insert|alter|truncate|create|grant|revoke|exec|execute|select)\b/i,
  },
  // "or 1=1", "and 2 = 2"
  { name: "tautology", re: /\b(?:or|and)\s+\d+\s*=\s*\d+/i },
  // "' OR 1", `" and 1`
  { name: "quoted-boolean", re: /['"`]\s*(?:or|and)\s+['"`]?\d/i },
  // time-based probes: pg_sleep(5), sleep(5), waitfor delay
  {
    name: "time-based",
    re: /\b(?:pg_sleep|sleep|benchmark|waitfor\s+delay)\s*\(/i,
  },
  // system/schema probing
  {
    name: "system-probe",
    re: /\b(?:information_schema|pg_catalog|pg_shadow|xp_cmdshell|sysobjects)\b/i,
  },
  // inline comment hiding a statement: /* select … */
  {
    name: "comment-injection",
    re: /\/\*[\s\S]*\b(?:select|from|where|drop|union|insert|update)\b[\s\S]*\*\//i,
  },
  // a bare SELECT … FROM … WHERE
  {
    name: "select-from-where",
    re: /\bselect\b[\s\S]{0,80}\bfrom\b[\s\S]{0,80}\bwhere\b/i,
  },
];

/** Return the names of any SQL-injection signatures found in `value`. */
export function findSqlInjectionSignals(value: string): string[] {
  const normalized = value.replace(/\s+/g, " ");
  const found: string[] = [];
  for (const { name, re } of SQL_INJECTION_PATTERNS) {
    if (re.test(normalized)) found.push(name);
  }
  return found;
}

/** True when `value` contains a high-signal SQL-injection signature. */
export function looksLikeSqlInjection(value: string): boolean {
  return findSqlInjectionSignals(value).length > 0;
}

export interface InjectionHit {
  path: string;
  signals: string[];
}

/**
 * Recursively scan an arbitrary (already-parsed or raw) input value for
 * injection signatures. Returns one entry per offending string, with a dotted
 * path (`items.0.name`) for logging. Used to add security telemetry when a
 * schema rejects input.
 */
export function scanForInjection(
  value: unknown,
  path = "",
): InjectionHit[] {
  const hits: InjectionHit[] = [];
  if (typeof value === "string") {
    const signals = findSqlInjectionSignals(value);
    if (signals.length) hits.push({ path: path || "(root)", signals });
    return hits;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) =>
      hits.push(...scanForInjection(v, path ? `${path}.${i}` : String(i))),
    );
    return hits;
  }
  if (value && typeof value === "object") {
    for (const [key, v] of Object.entries(value)) {
      hits.push(...scanForInjection(v, path ? `${path}.${key}` : key));
    }
  }
  return hits;
}
