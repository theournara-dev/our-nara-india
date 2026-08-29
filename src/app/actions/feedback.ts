"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { SITE } from "@/lib/constants";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

const feedbackSchema = z.object({
  email: z.string().email("Enter a valid email").max(200),
  message: z.string().min(5, "Please describe the issue.").max(5000),
  /** Client-side error trace/context (optional). */
  error: z
    .object({
      name: z.string().max(200).optional(),
      message: z.string().max(1000).optional(),
      digest: z.string().max(100).optional(),
      url: z.string().max(2000).optional(),
      userAgent: z.string().max(500).optional(),
    })
    .optional(),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;

export type FeedbackResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Simple in-memory per-IP rate limit: 3 submissions per 10 minutes. Best-effort
 * (resets on server restart) but stops casual spam of the DB + support inbox.
 * Serverless instances each keep their own map, which only makes spam cheaper
 * to absorb, not easier.
 */
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  if (recent.length >= RATE_LIMIT_MAX) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  // Opportunistic cleanup so the map can't grow unbounded.
  if (hits.size > 1000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) hits.delete(k);
    }
  }
  return false;
}

/** User-submitted feedback, optionally with a client error trace attached. */
export async function submitFeedback(
  input: FeedbackInput,
): Promise<FeedbackResult> {
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the form and try again.",
    };
  }
  const data = parsed.data;

  // Attach the server-visible client IP for support triage (best effort).
  let ip: string | null = null;
  try {
    const h = await headers();
    ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null;
  } catch {
    ip = null;
  }

  // Rate limit after IP resolution; fall back to a shared bucket if unknown.
  if (isRateLimited(ip ?? "unknown")) {
    return {
      ok: false,
      error:
        "Too many messages sent. Please wait a bit before trying again.",
    };
  }

  const trace = data.error ?? {};

  // Persist for the admin dashboard; email is best-effort on top.
  try {
    await db.feedback.create({
      data: {
        email: data.email.trim(),
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