"use server";

import { z } from "zod";
import { SITE } from "@/lib/constants";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getClientIp } from "@/lib/client-ip";
import { createRateLimiter } from "@/lib/rate-limit";
import { scanForInjection } from "@/lib/sanitize";
import { safeEmail, safeMultiline, safeText } from "@/lib/validation";

const feedbackSchema = z.object({
  email: safeEmail(),
  message: safeMultiline(5000, {
    min: 5,
    message: "Please describe the issue.",
  }),
  /** Client-side error trace/context (optional). */
  error: z
    .object({
      name: safeText(200).optional(),
      // Server-generated DB errors may legitimately contain SQL fragments, so
      // the trace message opts out of the injection heuristic.
      message: safeText(1000, { allowSql: true }).optional(),
      digest: safeText(100).optional(),
      url: safeText(2000).optional(),
      userAgent: safeText(500).optional(),
    })
    .optional(),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;

export type FeedbackResult = { ok: true } | { ok: false; error: string };

/**
 * Per-IP rate limit: 3 submissions per 10 minutes. Best-effort per instance
 * (resets on restart) but stops casual spam of the DB + support inbox.
 */
const limiter = createRateLimiter(3, 10 * 60 * 1000);

/** User-submitted feedback, optionally with a client error trace attached. */
export async function submitFeedback(
  input: FeedbackInput,
): Promise<FeedbackResult> {
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) {
    const hits = scanForInjection(input);
    if (hits.length) {
      console.warn(
        `[security] rejected "feedback.submit": possible SQL-injection payload at ${hits
          .map((h) => h.path)
          .join(", ")}`,
      );
    }
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the form and try again.",
    };
  }
  const data = parsed.data;

  // Attach the server-visible client IP for support triage (best effort).
  const ip = await getClientIp();

  // Rate limit after IP resolution; fall back to a shared bucket if unknown.
  if (limiter.check(ip ?? "unknown")) {
    return {
      ok: false,
      error: "Too many messages sent. Please wait a bit before trying again.",
    };
  }

  const trace = data.error ?? {};

  // Persist for the admin dashboard; email is best-effort on top.
  try {
    await db.feedback.create({
      data: {
        email: data.email,
        message: data.message,
        errorName: trace.name ?? null,
        errorMessage: trace.message ?? null,
        errorDigest: trace.digest ?? null,
        errorUrl: trace.url ?? null,
        userAgent: trace.userAgent ?? null,
        ip,
      },
    });
  } catch (err) {
    console.error("Failed to save feedback:", err);
    return {
      ok: false,
      error: "Could not send your message. Please try again.",
    };
  }

  const lines = [
    `Email: ${data.email}`,
    trace.url ? `Page: ${trace.url}` : null,
    ip ? `IP: ${ip}` : null,
    trace.userAgent ? `Browser: ${trace.userAgent}` : null,
    "",
    data.message,
    trace.name || trace.message || trace.digest
      ? [
          "",
          "--- Error trace ---",
          trace.name ? `Name: ${trace.name}` : null,
          trace.digest ? `Digest: ${trace.digest}` : null,
          trace.message ? `Message: ${trace.message}` : null,
        ]
          .filter(Boolean)
          .join("\n")
      : null,
  ].filter(Boolean);

  try {
    await sendEmail({
      to: SITE.supportEmail,
      subject: `[OUR:NARA] New contact message from ${data.email}`,
      text: lines.join("\n"),
    });
  } catch (err) {
    // The feedback is saved — just log the email failure.
    console.error("Failed to send feedback email:", err);
  }

  return { ok: true };
}
