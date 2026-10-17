import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SITE_CONTENT,
  GLOBAL_STORE_GRADIENT,
  normalizeTopBanner,
  topBannerBackgroundCss,
  type TopBannerBlock,
} from "../src/lib/site-content";

test("a solid block keeps its plain colour", () => {
  assert.equal(topBannerBackgroundCss({ background: "#6f2dbd" }), "#6f2dbd");
  assert.equal(
    topBannerBackgroundCss({
      background: "#6f2dbd",
      backgroundType: "solid",
    }),
    "#6f2dbd",
  );
});

test("a block with no background still has one", () => {
  assert.equal(topBannerBackgroundCss(null), "#18181b");
  assert.equal(topBannerBackgroundCss({ background: "" }), "#18181b");
});

test("a gradient is read left to right, stops sorted by position", () => {
  const css = topBannerBackgroundCss({
    background: "#000000",
    backgroundType: "gradient",
    gradientStops: [
      { color: "#7920FB", position: 100 },
      { color: "#F83658", position: 0 },
      { color: "#0894FD", position: 50 },
    ],
  });
  assert.equal(
    css,
    "linear-gradient(90deg, #F83658 0%, #0894FD 50%, #7920FB 100%)",
  );
});

test("a gradient with fewer than two stops falls back to the colour", () => {
  assert.equal(
    topBannerBackgroundCss({
      background: "#6f2dbd",
      backgroundType: "gradient",
      gradientStops: [{ color: "#F83658", position: 0 }],
    }),
    "#6f2dbd",
  );
});

test("the International store's default banner is the client's gradient", () => {
  const block = DEFAULT_SITE_CONTENT.global.topBanner[0];
  assert.equal(block?.kind, "text");
  assert.equal(block?.backgroundType, "gradient");
  assert.deepEqual(block?.gradientStops, GLOBAL_STORE_GRADIENT);
  assert.equal(
    topBannerBackgroundCss(block),
    "linear-gradient(90deg, #F83658 0%, #0894FD 50%, #7920FB 100%)",
  );
});

test("the India store keeps its purple banner", () => {
  const block = DEFAULT_SITE_CONTENT.local.topBanner[0];
  assert.equal(topBannerBackgroundCss(block), "#6f2dbd");
});

test("the stored JSON keeps a gradient and repairs its stops", () => {
  const blocks = normalizeTopBanner([
    {
      id: "b1",
      kind: "text",
      text: "Hello",
      background: "#000000",
      backgroundType: "gradient",
      gradientStops: [
        { color: "#F83658", position: -20 },
        { color: "#7920FB", position: 400 },
      ],
    },
  ]) as TopBannerBlock[];

  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].backgroundType, "gradient");
  assert.deepEqual(blocks[0].gradientStops, [
    { color: "#F83658", position: 0 },
    { color: "#7920FB", position: 100 },
  ]);
});

test("a broken gradient degrades to a solid block, never a crash", () => {
  const blocks = normalizeTopBanner([
    {
      id: "b1",
      kind: "text",
      text: "Hello",
      background: "#6f2dbd",
      backgroundType: "gradient",
      gradientStops: [{ color: "#F83658" }],
    },
  ]) as TopBannerBlock[];

  assert.equal(blocks[0].gradientStops, undefined);
  assert.equal(topBannerBackgroundCss(blocks[0]), "#6f2dbd");
});
