import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getEmbedSrc,
  parseShortsUrl,
  setVolumeCommand,
  volumeCommand,
} from "../src/lib/shorts";

test("a shorts URL is parsed into its platform and id", () => {
  assert.deepEqual(
    parseShortsUrl("https://www.youtube.com/shorts/krrZdPZxCVI"),
    { type: "youtube", id: "krrZdPZxCVI" },
  );
  assert.deepEqual(
    parseShortsUrl(
      "https://www.tiktok.com/@nowater_us/video/7621994499614559501",
    ),
    { type: "tiktok", id: "7621994499614559501" },
  );
  assert.deepEqual(
    parseShortsUrl("https://www.instagram.com/reel/C8abcDEF123/"),
    { type: "instagram", id: "C8abcDEF123" },
  );
  assert.equal(parseShortsUrl("https://example.com/video"), null);
});

test("the YouTube embed hides every native control and stays muted", () => {
  const src = getEmbedSrc({ type: "youtube", id: "krrZdPZxCVI" });
  assert.match(src, /\/embed\/krrZdPZxCVI\?/);
  assert.match(src, /autoplay=1/);
  assert.match(src, /mute=1/);
  assert.match(src, /controls=0/);
  assert.match(src, /fs=0/);
  assert.match(src, /cc_load_policy=0/);
  assert.match(src, /enablejsapi=1/);
  assert.doesNotMatch(src, /loop=/);
});

test("the TikTok embed hides its native control bar and mute", () => {
  const src = getEmbedSrc({ type: "tiktok", id: "7621994499614559501" });
  assert.match(src, /\/player\/v1\/7621994499614559501\?/);
  assert.match(src, /controls=0/);
  assert.match(src, /volume_control=0/);
  assert.match(src, /fullscreen_button=0/);
  assert.match(src, /closed_caption=0/);
  assert.match(src, /autoplay=1/);
  assert.doesNotMatch(src, /(^|&)(mute|muted)=/);
  assert.doesNotMatch(src, /loop=/);
});

test("an Instagram reel uses its embed path", () => {
  assert.equal(
    getEmbedSrc({ type: "instagram", id: "C8abcDEF123" }),
    "https://www.instagram.com/reel/C8abcDEF123/embed/",
  );
});

test("volume commands match each platform's messaging protocol", () => {
  assert.deepEqual(JSON.parse(volumeCommand("youtube", true) as string), {
    event: "command",
    func: "mute",
    args: [],
  });
  assert.deepEqual(JSON.parse(volumeCommand("youtube", false) as string), {
    event: "command",
    func: "unMute",
    args: [],
  });
  assert.deepEqual(volumeCommand("tiktok", true), {
    type: "mute",
    "x-tiktok-player": true,
  });
  assert.deepEqual(volumeCommand("tiktok", false), {
    type: "unMute",
    "x-tiktok-player": true,
  });
  assert.equal(volumeCommand("instagram", false), null);
});

test("volume levels use each platform's setVolume message", () => {
  assert.deepEqual(JSON.parse(setVolumeCommand("youtube", 42) as string), {
    event: "command",
    func: "setVolume",
    args: [42],
  });
  assert.deepEqual(setVolumeCommand("tiktok", 42), {
    type: "setVolume",
    value: 42,
    "x-tiktok-player": true,
  });
  assert.equal(setVolumeCommand("instagram", 42), null);
  assert.deepEqual(JSON.parse(setVolumeCommand("youtube", 180) as string), {
    event: "command",
    func: "setVolume",
    args: [100],
  });
  assert.deepEqual(JSON.parse(setVolumeCommand("youtube", -10) as string), {
    event: "command",
    func: "setVolume",
    args: [0],
  });
});
