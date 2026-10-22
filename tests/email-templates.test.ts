import assert from "node:assert/strict";
import { test } from "node:test";
import {
  escapeHtml,
  memberIdEmail,
  passwordResetEmail,
  verificationEmail,
} from "../src/lib/email-templates";

const url =
  "https://our-nara.com/api/auth/verify-email?token=abc123&callbackURL=%2Fverify-email";

test("verification email carries the link in both bodies", () => {
  const mail = verificationEmail({ name: "Asha", url });
  assert.match(mail.subject, /verify/i);
  assert.match(mail.text, /Asha/);
  assert.ok(mail.text.includes(url));
  assert.ok(mail.html.includes("token=abc123&amp;callbackURL"));
  assert.match(mail.html, /Verify email/i);
});

test("password reset email carries the link and its expiry", () => {
  const mail = passwordResetEmail({ name: "Asha", url });
  assert.match(mail.subject, /password/i);
  assert.ok(mail.text.includes(url));
  assert.ok(mail.html.includes(url.replace("&", "&amp;")));
  assert.match(mail.text, /1 hour/);
});

test("member ID email names the ID and links to sign in", () => {
  const mail = memberIdEmail({ name: "Asha", username: "asha99", url });
  assert.match(mail.subject, /member id/i);
  assert.match(mail.text, /asha99/);
  assert.ok(mail.text.includes(url));
  assert.ok(mail.html.includes("asha99"));
});

test("member ID email explains Google accounts have no ID", () => {
  const mail = memberIdEmail({ name: "Asha", username: null, url });
  assert.match(mail.subject, /sign in/i);
  assert.match(mail.text, /created with Google/);
  assert.match(mail.html, /Continue with Google/);
  assert.ok(!mail.text.includes("Your member ID is"));
  assert.ok(mail.text.includes(url));
});

test("names are escaped before they reach the HTML", () => {
  const mail = verificationEmail({
    name: '<img src=x onerror="alert(1)">',
    url,
  });
  assert.ok(!mail.html.includes("<img src=x"));
  assert.ok(mail.html.includes("&lt;img src=x"));
  assert.equal(escapeHtml("a & b <c>"), "a &amp; b &lt;c&gt;");
});
