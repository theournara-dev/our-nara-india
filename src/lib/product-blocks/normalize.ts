import "server-only";
import { BLOCK_TYPE_META_BY_TYPE } from "./types";
import { sanitizeHtml } from "@/lib/html";
import { sanitizeMultiline, sanitizeText } from "@/lib/sanitize";

/**
 * Validate a block's config against its type schema and sanitize the fields
 * that can carry markup. Runs on the server (admin action) so the stored
 * `ProductBlock.config` is always clean and range-checked.
 */
export function normalizeBlockConfig(
  type: string,
  config: unknown,
): Record<string, unknown> {
  const meta =
    BLOCK_TYPE_META_BY_TYPE[type as keyof typeof BLOCK_TYPE_META_BY_TYPE];
  if (!meta) throw new Error(`Unknown block type: ${type}`);
  const parsed = meta.configSchema.parse(config ?? {}) as Record<
    string,
    unknown
  >;
  return sanitizeConfig(type, parsed);
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function sanitizeConfig(
  type: string,
  c: Record<string, unknown>,
): Record<string, unknown> {
  switch (type) {
    case "rich-text":
      return { ...c, html: sanitizeHtml(str(c.html)) };
    case "image":
      return {
        ...c,
        src: sanitizeText(str(c.src)),
        alt: sanitizeText(str(c.alt)),
        caption: sanitizeText(str(c.caption)),
        href: sanitizeText(str(c.href)),
      };
    case "image-text":
      return {
        ...c,
        src: sanitizeText(str(c.src)),
        alt: sanitizeText(str(c.alt)),
        text: sanitizeMultiline(str(c.text)),
      };
    case "heading":
      return { ...c, text: sanitizeText(str(c.text)) };
    case "gallery":
      return {
        ...c,
        images: Array.isArray(c.images)
          ? c.images.map((i) => sanitizeText(str(i))).filter(Boolean)
          : [],
      };
    case "video":
      return { ...c, url: sanitizeText(str(c.url)) };
    case "button":
      return {
        ...c,
        label: sanitizeText(str(c.label)),
        href: sanitizeText(str(c.href)),
      };
    case "accordion":
      return {
        ...c,
        items: Array.isArray(c.items)
          ? c.items.map((it) => {
              const o = (it ?? {}) as Record<string, unknown>;
              return {
                q: sanitizeText(str(o.q)),
                a: sanitizeMultiline(str(o.a)),
              };
            })
          : [],
      };
    default:
      return c;
  }
}
