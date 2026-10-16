import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EVENT_BACKGROUND_DEFAULT,
  EVENT_CARD_RADIUS,
  EVENT_CARD_REFERENCE_WIDTH,
  EVENT_ZOOM_MAX,
  EVENT_ZOOM_MIN,
  eventBackground,
  eventBackgroundStyle,
  eventCardPreviewScale,
  nudgeFocus,
} from "../src/lib/event-background";

test("a card without stored framing covers itself the way it always did", () => {
  assert.deepEqual(eventBackground(null), EVENT_BACKGROUND_DEFAULT);
  assert.deepEqual(eventBackground({}), EVENT_BACKGROUND_DEFAULT);
  assert.equal(EVENT_BACKGROUND_DEFAULT.focusX, 50);
  assert.equal(EVENT_BACKGROUND_DEFAULT.focusY, 50);
  assert.equal(EVENT_BACKGROUND_DEFAULT.zoom, 100);
});

test("the focus point stays inside the image", () => {
  assert.equal(eventBackground({ focusX: -20, focusY: 140 }).focusX, 0);
  assert.equal(eventBackground({ focusX: -20, focusY: 140 }).focusY, 100);
  assert.equal(eventBackground({ focusX: 12.6 }).focusX, 13);
});

test("the zoom never shrinks the artwork below cover, nor runs away", () => {
  assert.equal(eventBackground({ zoom: 10 }).zoom, EVENT_ZOOM_MIN);
  assert.equal(eventBackground({ zoom: 900 }).zoom, EVENT_ZOOM_MAX);
  assert.equal(eventBackground({ zoom: 150 }).zoom, 150);
});

test("junk in a stored row falls back instead of rendering NaN", () => {
  assert.deepEqual(
    eventBackground({ focusX: Number.NaN, focusY: Number.POSITIVE_INFINITY }),
    EVENT_BACKGROUND_DEFAULT,
  );
});

test("the style always covers the card and anchors on the focus point", () => {
  assert.deepEqual(eventBackgroundStyle({ focusX: 30, focusY: 20 }), {
    objectPosition: "30% 20%",
  });
});

test("an untouched zoom adds no transform at all", () => {
  const style = eventBackgroundStyle({ zoom: 100 });
  assert.equal(style.transform, undefined);
  assert.equal(style.transformOrigin, undefined);
});

test("zooming magnifies around the focus point, so it never walks away", () => {
  const style = eventBackgroundStyle({ focusX: 25, focusY: 75, zoom: 150 });
  assert.equal(style.transform, "scale(1.5)");
  assert.equal(style.transformOrigin, "25% 75%");
});

test("a preview is the reference card scaled down, never blown up", () => {
  assert.equal(eventCardPreviewScale(EVENT_CARD_REFERENCE_WIDTH), 1);
  assert.equal(eventCardPreviewScale(360), 0.6);
  assert.equal(eventCardPreviewScale(900), 1);
  // Before a panel is measured there is nothing to scale against.
  assert.equal(eventCardPreviewScale(0), 1);
});

test("a drag across the card moves the focus across its whole range", () => {
  assert.equal(nudgeFocus(50, -EVENT_CARD_REFERENCE_WIDTH / 2), 100);
  assert.equal(nudgeFocus(50, EVENT_CARD_REFERENCE_WIDTH / 2), 0);
  // Dragging right reveals what sits left of the focus, like pushing a photo.
  assert.equal(nudgeFocus(50, 60), 40);
  assert.equal(nudgeFocus(0, 60), 0);
  assert.equal(nudgeFocus(100, -60), 100);
});

test("the preview quotes the card's own corner at the panel's scale", () => {
  assert.equal(EVENT_CARD_RADIUS * eventCardPreviewScale(360), 9.6);
  assert.equal(EVENT_CARD_RADIUS * eventCardPreviewScale(600), EVENT_CARD_RADIUS);
});
