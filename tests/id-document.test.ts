import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidIdDocumentUrl } from "../src/lib/blob";

test("accepts an https blob URL under the ids/ prefix", () => {
  assert.equal(
    isValidIdDocumentUrl(
      "https://ndoennfngice37ju.public.blob.vercel-storage.com/ids/abc-photo-1a2b3c.png",
    ),
    true,
  );
});

test("accepts a local /upload/ public asset", () => {
  assert.equal(
    isValidIdDocumentUrl("/upload/goodymall1/en/layout/star5.png"),
    true,
  );
});

test("rejects other hosts, protocols and paths", () => {
  assert.equal(isValidIdDocumentUrl("https://evil.example.com/ids/x.png"), false);
  assert.equal(
    isValidIdDocumentUrl(
      "https://store.public.blob.vercel-storage.com.evil.com/ids/x.png",
    ),
    false,
  );
  assert.equal(
    isValidIdDocumentUrl("http://store.public.blob.vercel-storage.com/ids/x.png"),
    false,
  );
  assert.equal(
    isValidIdDocumentUrl(
      "https://ndoennfngice37ju.public.blob.vercel-storage.com/products/x.png",
    ),
    false,
  );
  assert.equal(isValidIdDocumentUrl("/uploads/x.png"), false);
  assert.equal(isValidIdDocumentUrl("not a url"), false);
});
