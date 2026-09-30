import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeHtml } from "../src/lib/html";

test("keeps safe formatting", () => {
  const out = sanitizeHtml(
    "<h2>How to use</h2><p>Apply a small amount to <strong>clean skin</strong>.</p><ul><li>Morning</li><li>Night</li></ul>",
  );
  assert.match(out, /<h2>How to use<\/h2>/);
  assert.match(out, /<strong>clean skin<\/strong>/);
  assert.match(out, /<li>Morning<\/li>/);
});

test("strips script tags and their contents", () => {
  const out = sanitizeHtml('<p>hi</p><script>alert("xss")</script>');
  assert.doesNotMatch(out, /<script/i);
  assert.doesNotMatch(out, /alert/);
});

test("strips inline event handlers", () => {
  const out = sanitizeHtml('<img src="https://x/a.png" onerror="alert(1)">');
  assert.doesNotMatch(out, /onerror/i);
});

test("drops javascript: URLs", () => {
  const out = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
  assert.doesNotMatch(out, /javascript:/i);
});

test("allows safe style properties only", () => {
  const okay = sanitizeHtml('<p style="text-align:center">hi</p>');
  assert.match(okay, /text-align:center/);
  const bad = sanitizeHtml('<p style="position:fixed;behavior:url(x)">hi</p>');
  assert.doesNotMatch(bad, /position/);
  assert.doesNotMatch(bad, /behavior/);
});

test("adds rel=noopener to links", () => {
  const out = sanitizeHtml('<a href="https://example.com">x</a>');
  assert.match(out, /rel="noopener noreferrer"/);
});
