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

/** Build an embeddable iframe `src` for an already-parsed short. */
export function getEmbedSrc(parsed: ParsedShort): string {
  switch (parsed.type) {
    case "youtube":
      return `//www.youtube.com/embed/${parsed.id}?autoplay=1&mute=1&loop=1&playlist=${parsed.id}&controls=0&showinfo=0&rel=0&playsinline=1`;
    case "tiktok":
      return `https://www.tiktok.com/player/v1/${parsed.id}?autoplay=1&loop=1&controls=0&description=0`;
    case "instagram":
      return `https://www.instagram.com/reel/${parsed.id}/embed/`;
  }
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
