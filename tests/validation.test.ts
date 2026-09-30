import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { parseInput, safeEmail, safeMultiline, safeText } from "../src/lib/validation";

test("safeText trims and accepts ordinary text", () => {
  const result = safeText(50).safeParse("  Hello World  ");
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data, "Hello World");
});

test("safeText enforces max length", () => {
  assert.equal(safeText(5).safeParse("abcdef").success, false);
});

test("safeText enforces a required (min) field", () => {
  const schema = safeText(50, { min: 1, message: "Name is required" });
  const result = schema.safeParse("   ");
  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error.issues[0].message, "Name is required");
  }
});

test("safeText rejects injection payloads", () => {
  assert.equal(safeText(200).safeParse("' OR 1=1 --").success, false);
  assert.equal(safeText(200).safeParse("a; DROP TABLE users").success, false);
});

test("safeText can opt out of the injection guard for trusted content", () => {
  const schema = safeText(200, { allowSql: true });
  assert.equal(schema.safeParse("SELECT a FROM b WHERE c").success, true);
});

test("safeMultiline preserves newlines and rejects injection", () => {
  const ok = safeMultiline(100).safeParse("line 1\nline 2");
  assert.equal(ok.success, true);
  if (ok.success) assert.equal(ok.data, "line 1\nline 2");
  assert.equal(safeMultiline(100).safeParse("x; DELETE FROM y").success, false);
});

test("safeEmail lowercases and validates", () => {
  const result = safeEmail().safeParse("  Jane.Doe@Example.COM  ");
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data, "jane.doe@example.com");
  assert.equal(safeEmail().safeParse("not-an-email").success, false);
  assert.equal(safeEmail().safeParse("").success, false);
});

test("parseInput returns data on success and throws ZodError on failure", () => {
  const schema = z.object({ name: safeText(20, { min: 1 }) });
  assert.deepEqual(parseInput(schema, { name: " ok " }, "test"), { name: "ok" });
  assert.throws(() => parseInput(schema, { name: "" }, "test"), z.ZodError);
});

test("parseInput throws (and logs) on an injection payload", () => {
  const schema = z.object({ name: safeText(50) });
  assert.throws(
    () => parseInput(schema, { name: "1; DROP TABLE users" }, "test"),
    z.ZodError,
  );
});
