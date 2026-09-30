import { z } from "zod";
import {
  looksLikeSqlInjection,
  sanitizeMultiline,
  sanitizeText,
  scanForInjection,
} from "./sanitize";

/**
 * Shared zod field builders for server-action input.
 *
 * Every user-supplied text field should be built from these helpers so that
 * trimming, control-char stripping, length caps and the SQL-injection heuristic
 * are applied consistently. They are thin wrappers around `z.string()` so they
 * drop into existing `z.object({ … })` schemas unchanged.
 */

export interface SafeTextOptions {
  /** Minimum length after sanitization (default 0). */
  min?: number;
  /** Message shown when `min` is not met (default "This field is required."). */
  message?: string;
  /**
   * Skip the SQL-injection heuristic. Only for trusted, non-user content —
   * never for fields a visitor can type into.
   */
  allowSql?: boolean;
}

const INJECTION_MESSAGE = "Input contains characters that aren't allowed.";

function withInjectionGuard<T extends z.ZodType>(
  schema: T,
  allowSql: boolean | undefined,
): T {
  if (allowSql) return schema;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (schema as any).refine(
    (v: unknown) => !looksLikeSqlInjection(String(v)),
    { message: INJECTION_MESSAGE },
  );
}

/** A required/optional single-line text field, sanitized and length-capped. */
export function safeText(max: number, options: SafeTextOptions = {}) {
  const { min = 0, message, allowSql } = options;
  const schema = z
    .string()
    .transform((v) => sanitizeText(v))
    .refine((v) => v.length >= min, {
      message: message ?? "This field is required.",
    })
    .refine((v) => v.length <= max, {
      message: `Must be ${max} characters or fewer.`,
    });
  return withInjectionGuard(schema, allowSql);
}

/** A multi-line text field (newlines preserved), sanitized and length-capped. */
export function safeMultiline(max: number, options: SafeTextOptions = {}) {
  const { min = 0, message, allowSql } = options;
  const schema = z
    .string()
    .transform((v) => sanitizeMultiline(v))
    .refine((v) => v.length >= min, {
      message: message ?? "This field is required.",
    })
    .refine((v) => v.length <= max, {
      message: `Must be ${max} characters or fewer.`,
    });
  return withInjectionGuard(schema, allowSql);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A trimmed, lowercased, validated email field. */
export function safeEmail(max = 200) {
  return z
    .string()
    .transform((v) => v.trim().toLowerCase())
    .refine((v) => v.length > 0 && v.length <= max && EMAIL_RE.test(v), {
      message: "Enter a valid email",
    })
    .refine((v) => !looksLikeSqlInjection(v), { message: INJECTION_MESSAGE });
}

/**
 * Parse `input` with `schema`, adding security telemetry: when validation fails
 * and the raw input contains injection signatures, log the offending paths so
 * malicious traffic is visible in logs. Throws the ZodError on failure so
 * existing `try/catch` handling (e.g. `err instanceof z.ZodError`) still works.
 */
export function parseInput<T extends z.ZodType>(
  schema: T,
  input: unknown,
  context = "input",
): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const hits = scanForInjection(input);
    if (hits.length) {
      console.warn(
        `[security] rejected "${context}": possible SQL-injection payload at ${hits
          .map((h) => h.path)
          .join(", ")}`,
      );
    }
    throw result.error;
  }
  return result.data;
}
