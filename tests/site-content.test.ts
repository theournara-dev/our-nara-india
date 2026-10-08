import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_SWITCHER_CONTENT,
  normalizeSwitcher,
} from "../src/lib/site-content";

const base = DEFAULT_SWITCHER_CONTENT;

test("normalizeSwitcher keeps a stored nudge (icon, text and image)", () => {
  const parsed = normalizeSwitcher({
    ...base,
    nudge: { enabled: true, icon: "pointer", text: "Choose your store", image: "" },
  });
  assert.deepEqual(parsed.nudge, {
    enabled: true,
    icon: "pointer",
    text: "Choose your store",
    image: "",
  });
});

test("normalizeSwitcher falls back per missing nudge piece", () => {
  // A switcher saved before the nudge existed has none — the defaults apply,
  // so the arrow keeps working until an admin edits it.
  const legacy = normalizeSwitcher({ ...base });
  assert.deepEqual(legacy.nudge, base.nudge);
  assert.equal(legacy.nudge.enabled, true);
  assert.equal(legacy.nudge.icon, "chevron");

  // An unknown icon falls back instead of rendering nothing.
  const odd = normalizeSwitcher({
    ...base,
    nudge: { enabled: false, icon: "rocket", text: "", image: "" },
  });
  assert.equal(odd.nudge.enabled, false);
  assert.equal(odd.nudge.icon, "chevron");
});

test("normalizeSwitcher keeps a custom image and optional text empty by default", () => {
  const parsed = normalizeSwitcher({
    ...base,
    nudge: { enabled: true, icon: "chevron", image: "/upload/arrow.png" },
  });
  assert.equal(parsed.nudge.image, "/upload/arrow.png");
  assert.equal(parsed.nudge.text, "");
});
