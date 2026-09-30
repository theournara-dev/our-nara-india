import Link from "next/link";

/**
 * Storefront renderers for DETAIL-tab content blocks. Client-safe (no
 * server-only imports) so they can render inside the client `ProductDetail`.
 * Stored HTML was already sanitized on write (`normalizeBlockConfig`).
 */

export interface RenderBlock {
  id: string;
  type: string;
  title?: string;
  config: Record<string, unknown>;
}

const FONT_SIZE: Record<string, string> = {
  sm: "0.875rem",
  base: "1rem",
  lg: "1.125rem",
  xl: "1.375rem",
  "2xl": "1.75rem",
};

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v ? v : fallback;
}
function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function justify(align: string): "flex-start" | "center" | "flex-end" {
  return align === "center"
    ? "center"
    : align === "right"
      ? "flex-end"
      : "flex-start";
}

/** Convert a YouTube/Vimeo watch URL into an embeddable URL. */
export function toEmbedUrl(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube.com/embed${u.pathname}`;
    if (host.endsWith("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (u.pathname.startsWith("/embed/")) return url;
    }
    if (host.endsWith("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    return null;
  } catch {
    return null;
  }
}

export function ProductBlocks({ blocks }: { blocks: RenderBlock[] }) {
  if (!blocks.length) return null;
  return (
    <div className="space-y-8">
      {blocks.map((block) => (
        <BlockView key={block.id} block={block} />
      ))}
    </div>
  );
}

export function BlockView({ block }: { block: RenderBlock }) {
  const c = block.config ?? {};

  switch (block.type) {
    case "rich-text": {
      const html = str(c.html);
      if (!html) return null;
      return (
        <div
          className="text-[15px] leading-relaxed text-[#555] [&_a]:text-point-500 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[#e9e9e9] [&_blockquote]:pl-4 [&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-ink [&_h3]:mt-3 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_ol]:ml-1 [&_ol_li]:list-decimal [&_p]:mb-3 [&_strong]:font-semibold [&_strong]:text-ink"
          style={{
            textAlign: c.align === "center" ? "center" : c.align === "right" ? "right" : "left",
            fontSize: FONT_SIZE[str(c.fontSize, "base")] ?? "1rem",
            maxWidth: `${num(c.maxWidth, 100)}%`,
            margin: "0 auto",
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }

    case "heading": {
      const text = str(c.text);
      if (!text) return null;
      const level = str(c.level, "h2");
      const cls =
        level === "h4"
          ? "text-lg font-semibold text-ink"
          : level === "h3"
            ? "text-xl font-semibold text-ink"
            : "font-display text-2xl font-semibold text-ink";
      const style = { textAlign: c.align === "center" ? "center" : c.align === "right" ? "right" : "left" } as const;
      return (
        <div style={style}>
          {level === "h4" ? (
            <h4 className={cls}>{text}</h4>
          ) : level === "h3" ? (
            <h3 className={cls}>{text}</h3>
          ) : (
            <h2 className={cls}>{text}</h2>
          )}
        </div>
      );
    }

    case "image": {
      const src = str(c.src);
      if (!src) return null;
      const img = (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt={str(c.alt)}
          loading="lazy"
          className={`h-auto w-full ${c.rounded ? "rounded-xl" : ""}`}
        />
      );
      return (
        <div style={{ display: "flex", justifyContent: justify(str(c.align, "left")) }}>
          <figure style={{ width: `${num(c.widthPct, 100)}%` }}>
            {str(c.href) ? <Link href={str(c.href)}>{img}</Link> : img}
            {str(c.caption) && (
              <figcaption className="mt-2 text-center text-xs text-[#888]">
                {str(c.caption)}
              </figcaption>
            )}
          </figure>
        </div>
      );
    }

    case "image-text": {
      const src = str(c.src);
      const text = str(c.text);
      if (!src && !text) return null;
      const imageLeft = str(c.imageSide, "left") === "left";
      return (
        <div
          className={`flex flex-col gap-4 md:flex-row md:items-start ${
            imageLeft ? "" : "md:flex-row-reverse"
          }`}
        >
          {src && (
            <div
              className="w-full shrink-0"
              style={{ maxWidth: `${num(c.imageWidthPct, 40)}%` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={str(c.alt)}
                loading="lazy"
                className="h-auto w-full rounded-xl"
              />
            </div>
          )}
          {text && (
            <div className="flex-1 whitespace-pre-line text-[15px] leading-relaxed text-[#555]">
              {text}
            </div>
          )}
        </div>
      );
    }

    case "gallery": {
      const images = Array.isArray(c.images)
        ? (c.images as unknown[]).map((i) => str(i)).filter(Boolean)
        : [];
      if (!images.length) return null;
      const columns = num(c.columns, 2);
      const gap = num(c.gap, 8);
      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: `${gap}px`,
          }}
        >
          {images.map((src, i) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={`${src}-${i}`}
              src={src}
              alt=""
              loading="lazy"
              className="h-auto w-full rounded-lg"
            />
          ))}
        </div>
      );
    }

    case "video": {
      const embed = toEmbedUrl(str(c.url));
      if (!embed) return null;
      return (
        <div style={{ display: "flex", justifyContent: justify(str(c.align, "left")) }}>
          <div
            className="aspect-video overflow-hidden rounded-xl"
            style={{ width: `${num(c.widthPct, 100)}%` }}
          >
            <iframe
              src={embed}
              title="Product video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        </div>
      );
    }

    case "button": {
      const label = str(c.label);
      if (!label) return null;
      const solid = str(c.variant, "solid") === "solid";
      return (
        <div
          style={{
            textAlign:
              c.align === "center" ? "center" : c.align === "right" ? "right" : "left",
          }}
        >
          <Link
            href={str(c.href) || "#"}
            className={`inline-flex h-11 items-center justify-center rounded px-6 text-sm font-semibold transition-colors ${
              solid
                ? "bg-point-500 text-white hover:bg-point-600"
                : "border border-ink text-ink hover:bg-ink hover:text-white"
            }`}
          >
            {label}
          </Link>
        </div>
      );
    }

    case "divider":
      return (
        <hr
          className="border-t border-[#e9e9e9]"
          style={{ borderStyle: str(c.style, "solid") }}
        />
      );

    case "spacer":
      return <div style={{ height: `${num(c.height, 24)}px` }} aria-hidden />;

    case "accordion": {
      const items = Array.isArray(c.items)
        ? (c.items as Record<string, unknown>[])
        : [];
      const visible = items.filter((it) => str(it.q) || str(it.a));
      if (!visible.length) return null;
      return (
        <div className="divide-y divide-[#e9e9e9] border-y border-[#e9e9e9]">
          {visible.map((it, i) => (
            <details key={i} className="group py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-ink">
                {str(it.q)}
                <span className="ml-3 text-[#888] transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#555]">
                {str(it.a)}
              </p>
            </details>
          ))}
        </div>
      );
    }

    default:
      return null;
  }
}
