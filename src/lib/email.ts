import "server-only";

import type { SiteVersion } from "@/lib/site-version";

/**
 * Email sending abstraction. Uses Resend when `RESEND_API_KEY` is configured;
 * otherwise falls back to logging the message to the server console so the
 * signup/verification flow works in development without a provider.
 *
 * Env vars:
 *  - RESEND_API_KEY    : Resend API key. If unset, emails are logged to the
 *                        server console instead of sent.
 *  - EMAIL_FROM        : Fallback verified sender address, e.g.
 *                        "OUR:NARA <no-reply@your-domain.com>".
 *                        Defaults to no-reply@our-nara.com.
 *  - EMAIL_FROM_LOCAL  : Verified sender for the local site (our-nara.com).
 *                        Defaults to EMAIL_FROM / no-reply@our-nara.com.
 *  - EMAIL_FROM_GLOBAL : Verified sender for the global site (our-nara.co.kr).
 *                        Defaults to EMAIL_FROM / no-reply@our-nara.com.
 *  - RESEND_TEST_TO    : (dev only) If set, all mail is redirected to this inbox
 *                        instead of the real recipient, so you can test the flow
 *                        without a real address (Resend rejects example.com etc.).
 */

const DEFAULT_FROM = "OUR:NARA <no-reply@our-nara.com>";

type SendParams = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /**
   * Site version whose verified sender domain to use. Resolved through
   * `getFromForVersion`; ignored when `from` is provided.
   */
  version?: SiteVersion;
  /** Explicit sender override; takes precedence over `version`. */
  from?: string;
};

/**
 * Pick the verified sender for a site version: EMAIL_FROM_LOCAL for the local
 * site, EMAIL_FROM_GLOBAL for the global site, falling back to EMAIL_FROM and
 * finally the default OUR:NARA address.
 */
export function getFromForVersion(version: SiteVersion): string {
  if (version === "local") {
    return process.env.EMAIL_FROM_LOCAL ?? process.env.EMAIL_FROM ?? DEFAULT_FROM;
  }
  if (version === "global") {
    return process.env.EMAIL_FROM_GLOBAL ?? process.env.EMAIL_FROM ?? DEFAULT_FROM;
  }
  return process.env.EMAIL_FROM ?? DEFAULT_FROM;
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
  version,
  from,
}: SendParams) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Dev fallback: surface the message in the server log.
    console.log(
      `\n[email:dev] To: ${to}\n[email:dev] Subject: ${subject}\n[email:dev] ${text}\n`,
    );
    return { ok: true, dev: true };
  }

  // In development, optionally redirect all mail to a test inbox.
  const recipient = process.env.RESEND_TEST_TO || to;
  const sender =
    from ??
    (version ? getFromForVersion(version) : undefined) ??
    process.env.EMAIL_FROM ??
    DEFAULT_FROM;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: sender, to: recipient, subject, text, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Email not sent (${res.status}): ${body}`);
  }
  return { ok: true, dev: false };
}

/** Send a 6-digit email verification code. */
export async function sendVerificationCode(
  to: string,
  code: string,
  version?: SiteVersion,
) {
  return sendEmail({
    to,
    version,
    subject: "Verify your OUR:NARA email",
    text: `Your OUR:NARA verification code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    html: `<p>Your OUR:NARA verification code is</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p>
      <p>It expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`,
  });
}
