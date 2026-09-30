import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseSiteVersion,
  resolveSiteVersionFromHost,
  versionForOrder,
} from "../src/lib/site-version";

test("versionForOrder prefers the explicit siteVersion", () => {
  assert.equal(versionForOrder({ siteVersion: "global", currency: "INR" }), "global");
  assert.equal(versionForOrder({ siteVersion: "local", currency: "USD" }), "local");
});

test("versionForOrder falls back to currency", () => {
  assert.equal(versionForOrder({ siteVersion: null, currency: "USD" }), "global");
  assert.equal(versionForOrder({ siteVersion: null, currency: "INR" }), "local");
  assert.equal(versionForOrder({ currency: "USD" }), "global");
  assert.equal(versionForOrder({}), "local");
  assert.equal(versionForOrder({ siteVersion: "bogus", currency: "USD" }), "global");
});

test("parseSiteVersion only accepts known versions", () => {
  assert.equal(parseSiteVersion("local"), "local");
  assert.equal(parseSiteVersion("global"), "global");
  assert.equal(parseSiteVersion("other"), null);
  assert.equal(parseSiteVersion(null), null);
});

test("resolveSiteVersionFromHost maps the global domain only", () => {
  assert.equal(resolveSiteVersionFromHost("our-nara.co.kr"), "global");
  assert.equal(resolveSiteVersionFromHost("www.our-nara.co.kr"), "global");
  assert.equal(resolveSiteVersionFromHost("our-nara.com"), "local");
  assert.equal(resolveSiteVersionFromHost("our-nara.com:3000"), "local");
  assert.equal(resolveSiteVersionFromHost("localhost:3000"), "local");
  assert.equal(resolveSiteVersionFromHost(null), "local");
});
