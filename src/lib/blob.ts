import { put } from "@vercel/blob";

/** Image MIME types accepted for product images. */
const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
]);

/** Max upload size for a single image (5MB). */
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export function isAllowedImageType(type: string): boolean {
  return ALLOWED_IMAGE_TYPES.has(type);
}

export function isAllowedImageSize(size: number): boolean {
  return size <= MAX_IMAGE_SIZE;
}

/**
 * Upload an image to Vercel Blob and return its public URL. Validates the
 * MIME type and size before uploading.
 */
export async function uploadImage(file: File): Promise<string> {
  if (!isAllowedImageType(file.type)) {
    throw new Error("Unsupported file type. Use PNG, JPEG, GIF, WebP or AVIF.");
  }
  if (!isAllowedImageSize(file.size)) {
    throw new Error("Image is too large. Maximum size is 5MB.");
  }
  const { url } = await put(
    `products/${crypto.randomUUID()}-${file.name}`,
    file,
    {
      access: "public",
      addRandomSuffix: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    },
  );
  return url;
}

// ── Video uploads (shorts) ──────────────────────────────────────────────────

/** Video MIME types accepted for short-form videos. */
const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime", // .mov
]);

/** Max upload size for a single video (50MB). */
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

export function isAllowedVideoType(type: string): boolean {
  return ALLOWED_VIDEO_TYPES.has(type);
}

export function isAllowedVideoSize(size: number): boolean {
  return size <= MAX_VIDEO_SIZE;
}

/**
 * Upload a short-form video to Vercel Blob and return its public URL.
 * Validates the MIME type and size before uploading.
 */
export async function uploadVideo(file: File): Promise<string> {
  if (!isAllowedVideoType(file.type)) {
    throw new Error("Unsupported video type. Use MP4, WebM or MOV.");
  }
  if (!isAllowedVideoSize(file.size)) {
    throw new Error("Video is too large. Maximum size is 50MB.");
  }
  const { url } = await put(
    `shorts/${crypto.randomUUID()}-${file.name}`,
    file,
    {
      access: "public",
      addRandomSuffix: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    },
  );
  return url;
}

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|avif)$/i;

/**
 * Validate a pasted image URL: must be http(s), carry no credentials, not
 * point at a loopback/private host, and end in an image extension. This is a
 * baseline guard against obviously invalid or malicious URLs.
 */
export function isValidImageUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1"
  ) {
    return false;
  }
  return IMAGE_EXT_RE.test(url.pathname);
}
