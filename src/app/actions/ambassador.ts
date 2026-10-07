"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { getClientIp } from "@/lib/client-ip";
import { SITE } from "@/lib/constants";
import { db } from "@/lib/db";
import { getFromForVersion, sendEmail } from "@/lib/email";
import { createRateLimiter } from "@/lib/rate-limit";
import { scanForInjection } from "@/lib/sanitize";
import { loadSiteConfig } from "@/lib/site-config";
import {
  SITE_VERSION_COOKIE,
  getSiteUrl,
  parseSiteVersion,
  resolveRequestSiteVersion,
} from "@/lib/site-version";
import { safeEmail, safeMultiline, safeText } from "@/lib/validation";

/**
 * Storefront ambassador applications (see /ambassador). Expected failures are
 * RETURNED as structured results, never thrown: Next.js masks thrown Server
 * Action errors in production builds, so their messages would reach the client
 * as an opaque digest and break the friendly error copy.
 */

const ambassadorApplicationSchema = z
  .object({
    name: safeText(120, { min: 2, message: "Please enter your full name." }),
    email: safeEmail(),
    phone: safeText(40, { min: 7, message: "Please add a phone number." }),
    country: safeText(80, { min: 2, message: "Please select your country." }),
    city: safeText(80).optional(),
    instagram: safeText(200).optional(),
    tiktok: safeText(200).optional(),
    youtube: safeText(200).optional(),
    blog: safeText(200).optional(),
    followers: safeText(60, {
      min: 1,
      message: "Tell us roughly how many followers you have.",
    }),
    audience: safeText(200, {
      min: 2,
      message: "Tell us about your audience or niche.",
    }),
    motivation: safeMultiline(2000, {
      min: 30,
      message:
        "Tell us a little more about why you want to join (at least 30 characters).",
    }),
    experience: safeMultiline(2000).optional(),
  })
  // Socials are free text (handles or URLs, nothing per-platform validates),
  // but an application with no channel at all isn't actionable — require one.
  .refine(
    (v) =>
      [v.instagram, v.tiktok, v.youtube, v.blog].some(
        (s) => (s ?? "").trim().length > 0,
      ),
    { message: "Add at least one social profile or link." },
  );

export type AmbassadorApplicationInput = z.infer<
  typeof ambassadorApplicationSchema
>;

export type AmbassadorApplicationResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Per-IP rate limit: 3 applications per 10 minutes. Best-effort per instance
 * (resets on restart) but stops casual spam of the DB + store inbox.
 */
const limiter = createRateLimiter(3, 10 * 60 * 1000);

/** Optional fields are stored as NULL rather than an empty string. */
function orNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length ? trimmed : null;
}

export async function submitAmbassadorApplication(
  input: AmbassadorApplicationInput,
): Promise<AmbassadorApplicationResult> {
  const parsed = ambassadorApplicationSchema.safeParse(input);
  if (!parsed.success) {
    const hits = scanForInjection(input);
    if (hits.length) {
      console.warn(
        `[security] rejected "ambassador.apply": possible SQL-injection payload at ${hits
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

  const ip = await getClientIp();
  if (limiter.check(ip ?? "unknown")) {
    return {
      ok: false,
      error:
        "Too many applications sent. Please wait a bit before trying again.",
    };
  }

  // Resolve the site version. The client-side switcher writes a cookie, so it
  // wins when present; default visitors (no cookie) fall back to the host —
  // both production domains share one deployment, so the build-time default
  // can't tell them apart.
  const requestHeaders = await headers();
  const cookieStore = await cookies();
  const version =
    parseSiteVersion(cookieStore.get(SITE_VERSION_COOKIE)?.value) ??
    resolveRequestSiteVersion(
      requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
    );

  // Persist for the admin dashboard; the inbox email is best-effort on top.
  try {
    await db.ambassadorApplication.create({
      data: {
        siteVersion: version,
        name: data.name,
        email: data.email,
        phone: orNull(data.phone),
        country: orNull(data.country),
        city: orNull(data.city),
        instagram: orNull(data.instagram),
        tiktok: orNull(data.tiktok),
        youtube: orNull(data.youtube),
        blog: orNull(data.blog),
        followers: orNull(data.followers),
        audience: orNull(data.audience),
        motivation: orNull(data.motivation),
        experience: orNull(data.experience),
      },
    });
  } catch (err) {
    console.error("Failed to save ambassador application:", err);
    return {
      ok: false,
      error: "Could not send your application. Please try again.",
    };
  }

  const lines = [
    `Store: ${version}`,
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone || "—"}`,
    `Location: ${[data.country, data.city].filter(Boolean).join(", ") || "—"}`,
    `Instagram: ${data.instagram || "—"}`,
    `TikTok: ${data.tiktok || "—"}`,
    `YouTube: ${data.youtube || "—"}`,
    `Blog: ${data.blog || "—"}`,
    `Followers: ${data.followers || "—"}`,
    `Audience: ${data.audience || "—"}`,
    "",
    "Motivation:",
    data.motivation || "—",
    "",
    "Experience:",
    data.experience || "—",
    "",
    `Review: ${getSiteUrl(version)}/admin/ambassadors`,
  ];

  try {
    const site = await loadSiteConfig(version);
    await sendEmail({
      to: site.email,
      from: getFromForVersion(version),
      subject: `[${SITE.name}] New ambassador application — ${data.name}`,
      text: ["New ambassador application submitted.", "", ...lines].join("\n"),
    });
  } catch (err) {
    // The application is saved — just log the email failure.
    console.error("Failed to send ambassador application email:", err);
  }

  return { ok: true };
}
