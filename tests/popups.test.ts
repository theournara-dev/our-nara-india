import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_OVERLAY_OPACITY,
  DEFAULT_POPUP_WIDTH_PX,
  isFullScreenSize,
  isPopupContentLayout,
  isPopupDue,
  isPopupTextAlign,
  nextDuePopup,
  POPUP_CONTENT_LAYOUTS,
  POPUP_DAY_MS,
  POPUP_LIMITS,
  POPUP_TEXT_ALIGNS,
  popupImageHeight,
  popupOverlayOpacity,
  popupScale,
  popupWidthPx,
} from "../src/lib/popups";

const pending = (id: string, frequency: string) => ({ id, frequency });
const NOW = 1_700_000_000_000;

test("popupWidthPx uses the preset, clamps a custom width", () => {
  assert.equal(popupWidthPx("sm", null), 360);
  assert.equal(popupWidthPx("lg", null), 560);
  assert.equal(popupWidthPx("xl", null), 720);
  // Unknown/missing size falls back to the medium preset.
  assert.equal(popupWidthPx(null, null), DEFAULT_POPUP_WIDTH_PX);
  assert.equal(popupWidthPx("nonsense", 900), DEFAULT_POPUP_WIDTH_PX);
  // Custom widths are clamped into the allowed range.
  assert.equal(popupWidthPx("custom", 520), 520);
  assert.equal(popupWidthPx("custom", 100), POPUP_LIMITS.widthMin);
  assert.equal(popupWidthPx("custom", 5000), POPUP_LIMITS.widthMax);
  assert.equal(popupWidthPx("custom", null), DEFAULT_POPUP_WIDTH_PX);
});

test("popupScale and popupOverlayOpacity clamp junk into range", () => {
  assert.equal(popupScale(80), 80);
  assert.equal(popupScale(10), POPUP_LIMITS.scaleMin);
  assert.equal(popupScale(500), POPUP_LIMITS.scaleMax);
  assert.equal(popupScale(null), 100);
  assert.equal(popupOverlayOpacity(30), 30);
  assert.equal(popupOverlayOpacity(-5), 0);
  assert.equal(popupOverlayOpacity(100), POPUP_LIMITS.overlayOpacityMax);
  assert.equal(popupOverlayOpacity(null), DEFAULT_OVERLAY_OPACITY);
});

test("isFullScreenSize only matches the full-screen preset", () => {
  assert.equal(isFullScreenSize("full"), true);
  assert.equal(isFullScreenSize("lg"), false);
  assert.equal(isFullScreenSize("custom"), false);
  assert.equal(isFullScreenSize(null), false);
  assert.equal(isFullScreenSize(undefined), false);
});

test("popupWidthPx ignores the stored width for full screen", () => {
  // The card fills the viewport, so any stored width is unused; the helper
  // still returns the medium preset so callers have a sane number.
  assert.equal(popupWidthPx("full", null), DEFAULT_POPUP_WIDTH_PX);
  assert.equal(popupWidthPx("full", 520), DEFAULT_POPUP_WIDTH_PX);
});

test("popupImageHeight returns null for unset and clamps into range", () => {
  // Unset (and junk) keeps the image's own aspect ratio.
  assert.equal(popupImageHeight(null), null);
  assert.equal(popupImageHeight(undefined), null);
  assert.equal(popupImageHeight(0), null);
  assert.equal(popupImageHeight(-40), null);
  assert.equal(popupImageHeight(Number.NaN), null);
  // A set height crops the image to fill the media box.
  assert.equal(popupImageHeight(320), 320);
  assert.equal(popupImageHeight(300.6), 301);
  assert.equal(popupImageHeight(10), POPUP_LIMITS.imageHeightMin);
  assert.equal(popupImageHeight(9999), POPUP_LIMITS.imageHeightMax);
});

test("content layout and text alignment guards accept known values only", () => {
  for (const value of POPUP_CONTENT_LAYOUTS) {
    assert.equal(isPopupContentLayout(value), true);
  }
  assert.equal(isPopupContentLayout("fill"), false);
  assert.equal(isPopupContentLayout(null), false);
  for (const value of POPUP_TEXT_ALIGNS) {
    assert.equal(isPopupTextAlign(value), true);
  }
  assert.equal(isPopupTextAlign("justify"), false);
  assert.equal(isPopupTextAlign(undefined), false);
});

test("isPopupDue respects session, day and every frequencies", () => {
  const shown = new Set(["a"]);
  const suppressed = { b: NOW - 1000 };

  // Anything already shown (this load / this session) is skipped — that is
  // what makes an "every visit" popup show once per page load.
  assert.equal(isPopupDue(pending("z", "every"), shown, suppressed, NOW), true);
  assert.equal(
    isPopupDue(pending("a", "every"), new Set(["a"]), suppressed, NOW),
    false,
  );
  // "once" is due until it has been shown this session.
  assert.equal(isPopupDue(pending("a", "once"), shown, suppressed, NOW), false);
  assert.equal(isPopupDue(pending("c", "once"), shown, suppressed, NOW), true);
  // "day" waits 24h from the last display / "don't show again today" click.
  assert.equal(isPopupDue(pending("b", "day"), shown, suppressed, NOW), false);
  assert.equal(
    isPopupDue(pending("b", "day"), shown, suppressed, NOW + POPUP_DAY_MS),
    true,
  );
});

test("nextDuePopup walks a stack one by one, skipping what was shown", () => {
  const queue = [
    pending("a", "once"),
    pending("b", "once"),
    pending("c", "every"),
  ];
  // Nothing shown yet → the first popup.
  assert.equal(nextDuePopup(queue, new Set(), {}, NOW)?.id, "a");
  // After closing "a" it is marked seen, so "b" comes next.
  assert.equal(nextDuePopup(queue, new Set(["a"]), {}, NOW)?.id, "b");
  // "every" popups stay due for the next page load, but the host only shows
  // each id once per load (it passes everything shown so far in the set).
  assert.equal(nextDuePopup(queue, new Set(["a", "b"]), {}, NOW)?.id, "c");
  assert.equal(nextDuePopup(queue, new Set(["a", "b", "c"]), {}, NOW), null);
});

test("nextDuePopup skips the popup that was just dismissed", () => {
  const queue = [pending("a", "every"), pending("b", "every")];
  // Both stay due for the next load, so the just-closed id is skipped too.
  assert.equal(nextDuePopup(queue, new Set(["a"]), {}, NOW, "a")?.id, "b");
});
