/**
 * Transactional email bodies. Pure string builders so the wording and the
 * link can be checked without a mail provider — `src/lib/email.ts` only does
 * the sending.
 *
 * Inline styles and tables only: mail clients drop stylesheets, CSS variables
 * and most layout properties.
 */

export type EmailContent = {
  subject: string;
  text: string;
  html: string;
};

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const POINT = "#6f2dbd";
const INK = "#222222";
const MUTED = "#888888";

function button(label: string, url: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0">
    <tr><td style="border-radius:6px;background:${POINT}">
      <a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none">${escapeHtml(label)}</a>
    </td></tr>
  </table>`;
}

function layout({
  preheader,
  heading,
  body,
  footer,
}: {
  preheader: string;
  heading: string;
  body: string;
  footer: string;
}) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f1f8">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1f8">
  <tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:10px">
      <tr><td style="padding:36px 36px 0">
        <p style="margin:0 0 28px;font-family:Arial,Helvetica,sans-serif;font-size:19px;font-weight:bold;letter-spacing:3px;color:${POINT}">OUR:NARA</p>
        <h1 style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:1.3;color:${INK}">${escapeHtml(heading)}</h1>
        ${body}
      </td></tr>
      <tr><td style="padding:0 36px 32px">
        <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #eeeeee;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${MUTED}">${footer}</p>
      </td></tr>
    </table>
    <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${MUTED}">OUR:NARA · This is an automated message.</p>
  </td></tr>
</table>
</body>
</html>`;
}

function paragraph(html: string) {
  return `<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#555555">${html}</p>`;
}

function greeting(name?: string | null) {
  return name ? `Hi ${escapeHtml(name)},` : "Hi,";
}

function plainGreeting(name?: string | null) {
  return name ? `Hi ${name},` : "Hi,";
}

function fallback(url: string) {
  return paragraph(
    `If the button does not work, copy this address into your browser:<br><span style="color:${POINT};word-break:break-all">${escapeHtml(url)}</span>`,
  );
}

export function verificationEmail({
  name,
  url,
}: {
  name?: string | null;
  url: string;
}): EmailContent {
  const heading = "Verify your email address";
  return {
    subject: "Verify your email address · OUR:NARA",
    text: `${plainGreeting(name)}

Thanks for joining OUR:NARA. Open the link below to verify this email address and finish setting up your account:

${url}

The link expires in 1 hour. If you didn't create an account, you can ignore this email.`,
    html: layout({
      preheader: "One click to verify your OUR:NARA email address.",
      heading,
      body:
        paragraph(greeting(name)) +
        paragraph(
          "Thanks for joining OUR:NARA. Verify this email address to finish setting up your account.",
        ) +
        button("Verify email", url) +
        fallback(url),
      footer:
        "The link expires in 1 hour. If you didn't create an OUR:NARA account, you can ignore this email — nothing will change.",
    }),
  };
}

export function passwordResetEmail({
  name,
  url,
}: {
  name?: string | null;
  url: string;
}): EmailContent {
  const heading = "Reset your password";
  return {
    subject: "Reset your password · OUR:NARA",
    text: `${plainGreeting(name)}

We received a request to reset the password for your OUR:NARA account. Open the link below to choose a new one:

${url}

The link expires in 1 hour. If you didn't ask for a reset, you can ignore this email — your password has not changed.`,
    html: layout({
      preheader: "Choose a new password for your OUR:NARA account.",
      heading,
      body:
        paragraph(greeting(name)) +
        paragraph(
          "We received a request to reset the password for your OUR:NARA account.",
        ) +
        button("Choose a new password", url) +
        fallback(url),
      footer:
        "The link expires in 1 hour. If you didn't ask for a reset, you can ignore this email — your password has not changed.",
    }),
  };
}

export function memberIdEmail({
  name,
  username,
  url,
}: {
  name?: string | null;
  username: string;
  url: string;
}): EmailContent {
  const heading = "Your OUR:NARA member ID";
  return {
    subject: "Your OUR:NARA member ID",
    text: `${plainGreeting(name)}

Your member ID is ${username}. You can sign in with it or with this email address.

${url}

If you didn't ask for your member ID, you can ignore this email.`,
    html: layout({
      preheader: `Your member ID is ${username}.`,
      heading,
      body:
        paragraph(greeting(name)) +
        paragraph("Your member ID is:") +
        `<p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:24px;font-weight:bold;letter-spacing:1px;color:${INK}">${escapeHtml(username)}</p>` +
        paragraph(
          "Sign in with this ID or with your email address, together with your password.",
        ) +
        button("Sign in", url) +
        fallback(url),
      footer:
        "If you didn't ask for your member ID, you can ignore this email.",
    }),
  };
}
