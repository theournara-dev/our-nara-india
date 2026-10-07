import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getVersionConfig,
  parseSiteVersion,
  resolveRequestSiteVersion,
  resolveSiteVersionFromHost,
  versionForOrder,
} from "../src/lib/site-version";
import { priceForVersion } from "../src/lib/money";

test("both stores price in INR", () => {
  assert.equal(getVersionConfig("local").currency, "INR");
  // Razorpay only settles INR, so the global store must be INR too.
  assert.equal(getVersionConfig("global").currency, "INR");
});

test("the global domain resolves to the INR global store", () => {
  const version = resolveRequestSiteVersion("our-nara.co.kr");
  assert.equal(version, "global");
  assert.equal(getVersionConfig(version).currency, "INR");
});

test("priceForVersion charges each store its own amount", () => {
  assert.equal(priceForVersion(180000, 200000, "global"), 200000);
  assert.equal(priceForVersion(180000, 200000, "local"), 180000);
  // An unset international price falls back to the local amount.
  assert.equal(priceForVersion(180000, null, "global"), 180000);
  assert.equal(priceForVersion(180000, undefined, "global"), 180000);
  assert.equal(priceForVersion(180000, undefined, "local"), 180000);
});

test("versionForOrder prefers the explicit siteVersion", () => {
  assert.equal(
    versionForOrder({ siteVersion: "global", currency: "INR" }),
    "global",
  );
  assert.equal(
    versionForOrder({ siteVersion: "local", currency: "USD" }),
    "local",
  );
});

test("versionForOrder falls back to currency", () => {
  assert.equal(
    versionForOrder({ siteVersion: null, currency: "USD" }),
    "global",
  );
  assert.equal(
    versionForOrder({ siteVersion: null, currency: "INR" }),
    "local",
  );
  assert.equal(versionForOrder({ currency: "USD" }), "global");
  assert.equal(versionForOrder({}), "local");
  assert.equal(
    versionForOrder({ siteVersion: "bogus", currency: "USD" }),
    "global",
  );
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
