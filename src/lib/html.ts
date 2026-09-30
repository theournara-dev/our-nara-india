import sanitizeHtmlLib from "sanitize-html";

/**
 * HTML sanitizer for admin-authored rich content (DETAIL blocks). Applied on
 * **write** (see `src/lib/product-blocks/normalize.ts`) so stored HTML is
 * trusted, and available for any read-time checks.
 *
 * Server-use only by convention (it is imported from server actions/data
 * layers); kept free of the `server-only` guard so it can be unit-tested.
 *
 * Allow-list only: no `<script>`, no inline event handlers, no `javascript:`
 * URLs. Inline `style` is permitted but restricted to a small set of layout
 * properties so admins can style text/images without escaping the design.
 */
const OPTIONS: sanitizeHtmlLib.IOptions = {
  allowedTags: [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "br",
    "hr",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "del",
    "sub",
    "sup",
    "ul",
    "ol",
    "li",
    "blockquote",
    "a",
    "img",
    "span",
    "div",
    "figure",
    "figcaption",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan"],
    "*": ["style"],
  },
  allowedStyles: {
    "*": {
      "text-align": [/^(left|right|center|justify)$/],
      "font-size": [/^\d+(\.\d+)?(px|em|rem|%)$/],
      "font-weight": [/^(normal|bold|[1-9]00)$/],
      color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\([^)]*\)$/i],
      "max-width": [/^\d+(\.\d+)?(px|%|rem|em)$/],
      width: [/^\d+(\.\d+)?(px|%|rem|em)$/],
      margin: [/^[-\d.\sa-z%]+$/i],
      padding: [/^[-\d.\sa-z%]+$/i],
    },
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  transformTags: {
    a: sanitizeHtmlLib.simpleTransform("a", {
      rel: "noopener noreferrer",
      target: "_blank",
    }),
  },
  disallowedTagsMode: "discard",
};

/** Sanitize a string of HTML down to the allow-list above. */
export function sanitizeHtml(dirty: string): string {
  return sanitizeHtmlLib(dirty, OPTIONS);
}
