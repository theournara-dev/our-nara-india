import type { ShortsPlatform } from "@/data/shorts";

/** A parsed short-form video reference extracted from a platform URL. */
export interface ParsedShort {
  type: ShortsPlatform;
  id: string;
}

/**
 * Detect the platform and extract the video id from a short-form URL.
 * Handles YouTube Shorts / watch / youtu.be, TikTok video links, and
 * Instagram Reels / posts. Returns `null` when nothing matches.
 */
export function parseShortsUrl(url: string): ParsedShort | null {
  if (!url) return null;
  const input = url.trim();

  // ── YouTube ──────────────────────────────────────────────────────────────
  let m = input.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/);
  if (m) return { type: "youtube", id: m[1] };

  m = input.match(/youtube\.com\/(?:embed|v)\/([A-Za-z0-9_-]{11})/);
  if (m) return { type: "youtube", id: m[1] };

  m = input.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (m) return { type: "youtube", id: m[1] };

  m = input.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (m) return { type: "youtube", id: m[1] };

  if (/^[A-Za-z0-9_-]{11}$/.test(input)) {
    return { type: "youtube", id: input };
  }

  // ── TikTok ───────────────────────────────────────────────────────────────
  m = input.match(/\/video\/(\d+)/);
  if (m) return { type: "tiktok", id: m[1] };

  m = input.match(/\/player\/v1\/(\d+)/);
  if (m) return { type: "tiktok", id: m[1] };

  if (/^\d{15,25}$/.test(input)) {
    return { type: "tiktok", id: input };
  }

  // ── Instagram (Reels or posts) ───────────────────────────────────────────
  m = input.match(/instagram\.com\/reels?\/([A-Za-z0-9_-]+)/);
  if (m) return { type: "instagram", id: m[1] };

  m = input.match(/instagram\.com\/p\/([A-Za-z0-9_-]+)/);
  if (m) return { type: "instagram", id: m[1] };

  return null;
}

/**
 * Build an embeddable iframe `src` for an already-parsed short.
 *
 * The native control bars are off: the carousel draws one volume control of
 * its own. YouTube only lets a page hide its gear and CC buttons by hiding the
 * whole control bar (`controls=0`), and TikTok ignores its per-button flags, so
 * `controls=0` is the only setting that actually leaves a single control.
 */
export function getEmbedSrc(parsed: ParsedShort): string {
  switch (parsed.type) {
    case "youtube":
      // `enablejsapi=1` lets the host listen for `onStateChange` (ended) and
      // toggle mute via postMessage. No `loop`: it would stop the ended state
      // from firing.
      return `https://www.youtube.com/embed/${parsed.id}?autoplay=1&mute=1&controls=0&fs=0&cc_load_policy=0&iv_load_policy=3&rel=0&playsinline=1&enablejsapi=1`;
    case "tiktok":
      // No `loop`: the player's postMessage API reports the ended state
      // (onStateChange 0) only when the video actually finishes. No `mute` or
      // `muted`: either one would silence the player or disable its volume
      // button.
      return `https://www.tiktok.com/player/v1/${parsed.id}?autoplay=1&controls=0&progress_bar=0&play_button=0&volume_control=0&fullscreen_button=0&closed_caption=0&description=0`;
    case "instagram":
      return `https://www.instagram.com/reel/${parsed.id}/embed/`;
  }
}

/**
 * The postMessage a platform expects for its volume control. YouTube takes a
 * JSON string through its IFrame API; TikTok takes an object marked with
 * `x-tiktok-player`. Instagram exposes neither, so it returns null.
 */
export function volumeCommand(
  type: ShortsPlatform,
  muted: boolean,
): string | Record<string, unknown> | null {
  if (type === "youtube") {
    return JSON.stringify({
      event: "command",
      func: muted ? "mute" : "unMute",
      args: [],
    });
  }
  if (type === "tiktok") {
    return {
      type: muted ? "mute" : "unMute",
      // TikTok's listener ignores "unMute" when a `value` field is present;
      // both methods are parameterless in its documented protocol.
      "x-tiktok-player": true,
    };
  }
  return null;
}

/**
 * The postMessage that sets an absolute volume (0–100). TikTok does not
 * document this method, but its player accepts `setVolume` and reports the new
 * level through `onVolumeChange` (verified in the browser).
 */
export function setVolumeCommand(
  type: ShortsPlatform,
  volume: number,
): string | Record<string, unknown> | null {
  const level = Math.max(0, Math.min(100, Math.round(volume)));
  if (type === "youtube") {
    return JSON.stringify({
      event: "command",
      func: "setVolume",
      args: [level],
    });
  }
  if (type === "tiktok") {
    return {
      type: "setVolume",
      value: level,
      "x-tiktok-player": true,
    };
  }
  return null;
}

/** Static poster for a YouTube video (no runtime fetch needed). */
export function getYouTubeThumbnail(id: string): string {
  return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
}

/**
 * Static poster for a TikTok video. There is no public static thumbnail URL,
 * so we request TikTok's oembed JSON and read `thumbnail_url` at runtime.
 * Returns `null` when TikTok is unreachable.
 */
const tiktokThumbCache = new Map<string, Promise<string | null>>();

export function getTikTokThumbnail(videoUrl: string): Promise<string | null> {
  const key = videoUrl;
  let promise = tiktokThumbCache.get(key);
  if (!promise) {
    promise = fetchTikTokThumbnail(key);
    tiktokThumbCache.set(key, promise);
  }
  return promise;
}

async function fetchTikTokThumbnail(videoUrl: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl.split("?")[0])}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { thumbnail_url?: string };
    return data.thumbnail_url ?? null;
  } catch {
    return null;
  }
}
