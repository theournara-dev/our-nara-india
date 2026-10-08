import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseStoreHours,
  storeHoursLines,
  hasAnyHours,
} from "../src/lib/store-hours";
import { isCoordinateQuery, parseMapInput } from "../src/lib/store-location";

test("parseStoreHours tolerates junk and normalises times", () => {
  const parsed = parseStoreHours({
    mon: { closed: false, open: "9:00", close: "18:00" },
    tue: { closed: false, open: "25:00", close: "18:00" },
    wed: "nonsense",
    thu: { closed: true, open: "10:00", close: "16:00" },
  });
  assert.deepEqual(parsed.mon, {
    closed: false,
    open: "09:00",
    close: "18:00",
  });
  // 25:00 is not a time — the default stands.
  assert.equal(parsed.tue?.open, "09:00");
  assert.equal(parsed.wed, undefined);
  assert.equal(parsed.thu?.closed, true);
});

test("storeHoursLines compresses identical consecutive days", () => {
  const week = parseStoreHours({
    mon: { closed: false, open: "09:00", close: "18:00" },
    tue: { closed: false, open: "09:00", close: "18:00" },
    wed: { closed: false, open: "09:00", close: "18:00" },
    thu: { closed: false, open: "09:00", close: "18:00" },
    fri: { closed: false, open: "09:00", close: "18:00" },
    sat: { closed: true, open: "09:00", close: "18:00" },
    sun: { closed: true, open: "09:00", close: "18:00" },
  });
  assert.deepEqual(storeHoursLines(week), [
    "Mon–Fri 09:00–18:00",
    "Sat, Sun Closed",
  ]);
  assert.equal(hasAnyHours(week), true);
  assert.deepEqual(storeHoursLines({}), []);
  assert.deepEqual(storeHoursLines(null), []);
});

test("storeHoursLines keeps a single different day separate", () => {
  const week = parseStoreHours({
    mon: { closed: false, open: "10:00", close: "20:00" },
    tue: { closed: false, open: "09:00", close: "18:00" },
  });
  assert.deepEqual(storeHoursLines(week), [
    "Mon 10:00–20:00",
    "Tue 09:00–18:00",
    "Wed–Sun Closed",
  ]);
});

test("parseMapInput understands the Google Maps link shapes", () => {
  assert.equal(
    parseMapInput(
      "https://www.google.com/maps/place/One+World/@19.186,72.848,17z/data=!3m1!4b1!4m6!3d19.1851!4d72.8492",
    ),
    "19.1851,72.8492",
  );
  assert.equal(
    parseMapInput("https://maps.google.com/?q=19.185,72.849"),
    "19.185,72.849",
  );
  assert.equal(
    parseMapInput("https://www.google.com/maps/place/Malad+West+Mumbai/"),
    "Malad West Mumbai",
  );
  // Plain text stays as typed.
  assert.equal(parseMapInput("  Malad West, Mumbai  "), "Malad West, Mumbai");
  assert.equal(parseMapInput("19.2, 72.9"), "19.2,72.9");
  assert.equal(parseMapInput(""), "");
});

test("isCoordinateQuery flags pinned coordinates", () => {
  assert.equal(isCoordinateQuery("19.1851,72.8492"), true);
  assert.equal(isCoordinateQuery("12.34, 56.78"), true);
  assert.equal(isCoordinateQuery("Malad West Mumbai"), false);
  assert.equal(isCoordinateQuery("120,300"), false);
});
