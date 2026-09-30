import { test } from "node:test";
import assert from "node:assert/strict";
import {
  findSqlInjectionSignals,
  looksLikeSqlInjection,
  sanitizeMultiline,
  sanitizeText,
  scanForInjection,
} from "../src/lib/sanitize";

test("sanitizeText trims and collapses whitespace", () => {
  assert.equal(sanitizeText("  hello \n\t world  "), "hello world");
});

test("sanitizeText strips control characters", () => {
  assert.equal(sanitizeText("a\u0000b\u0007c"), "abc");
});

test("sanitizeText turns non-breaking spaces into normal spaces", () => {
  assert.equal(sanitizeText("a\u00A0b"), "a b");
});

test("sanitizeMultiline preserves meaningful newlines", () => {
  assert.equal(sanitizeMultiline("line 1\nline 2"), "line 1\nline 2");
});

test("sanitizeMultiline normalizes CRLF and collapses 3+ newlines", () => {
  assert.equal(sanitizeMultiline("a\r\nb\n\n\n\nc"), "a\nb\n\nc");
});

test("sanitizeMultiline trims trailing spaces per line", () => {
  assert.equal(sanitizeMultiline("a   \nb\t\n"), "a\nb");
});

test("detects classic injection payloads", () => {
  const payloads = [
    "' OR 1=1 --",
    "1; DROP TABLE users",
    "1; DELETE FROM products",
    "x UNION ALL SELECT password FROM users WHERE 1=1",
    "' or 2 = 2",
    '" and 1',
    "pg_sleep(5)",
    "SLEEP(5)",
    "information_schema.tables",
    "/* select * from users */",
    "SELECT id FROM users WHERE name = 'a'",
  ];
  for (const p of payloads) {
    assert.equal(looksLikeSqlInjection(p), true, `should flag: ${p}`);
    assert.ok(findSqlInjectionSignals(p).length > 0, `signals: ${p}`);
  }
});

test("does not flag ordinary user text", () => {
  const benign = [
    "Return Collagen Cream 50g",
    "Firming · Plumping · Barrier Care",
    "I love this — it's great, 5/5!",
    "jane.doe+1@example.com",
    "12/A, Main Road; near the school",
    'She said "or maybe not"',
    "Select item with details above",
    "Masks & Patches, Set",
    "Question: when will my order arrive?",
    "Hair Care & Makeup: Sun Care",
  ];
  for (const t of benign) {
    assert.equal(looksLikeSqlInjection(t), false, `should NOT flag: ${t}`);
  }
});

test("scanForInjection walks nested structures and reports paths", () => {
  const hits = scanForInjection({
    name: "ok",
    items: [{ sku: "1; DROP TABLE x" }, { sku: "safe" }],
  });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].path, "items.0.sku");
  assert.ok(hits[0].signals.includes("stacked-query"));
});

test("scanForInjection returns nothing for clean input", () => {
  assert.deepEqual(scanForInjection({ a: "hello", b: ["world"] }), []);
});
