import "server-only";

/**
 * Email sending abstraction. Uses Resend when `RESEND_API_KEY` is configured;
 * otherwise falls back to logging the message to the server console so the
 * signup/verification flow works in development without a provider.
 *
 * Env vars:
 *  - RESEND_API_KEY  : Resend API key. If unset, emails are logged to the
 *                      server console instead of sent.
 *  - EMAIL_FROM      : Verified sender address, e.g. "OUR:NARA <no-reply@your-domain.com>".
 *                      Defaults to no-reply@our-nara.com.
 *  - RESEND_TEST_TO  : (dev only) If set, all mail is redirected to this inbox
 *                      instead of the real recipient, so you can test the flow
 *                      without a real address (Resend rejects example.com etc.).
 */

type SendParams = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail({ to, subject, text, html }: SendParams) {
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
  const from = process.env.EMAIL_FROM || "OUR:NARA <no-reply@our-nara.com>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: recipient, subject, text, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Email not sent (${res.status}): ${body}`);
  }
  return { ok: true, dev: false };
}

/** Send a 6-digit email verification code. */
export async function sendVerificationCode(to: string, code: string) {
  return sendEmail({
    to,
    subject: "Verify your OUR:NARA email",
    text: `Your OUR:NARA verification code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    html: `<p>Your OUR:NARA verification code is</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p>
      <p>It expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`,
  });
}
