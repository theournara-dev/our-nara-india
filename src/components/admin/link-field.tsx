"use client";

import { inputCls, labelCls } from "@/components/admin/field-styles";

/**
 * Storefront link builder, shared by the page builder and the standalone admin
 * forms (events, banners). Instead of typing a URL, the admin picks the kind of
 * destination — a store page, brand, category or product — and then the target,
 * with the resolved URL shown below for confidence. Anything that doesn't match
 * a known destination is kept as a custom URL so existing content never loses
 * its link.
 */

/** The static storefront pages a link can point at. */
export const STORE_PAGES = [
  { value: "/", label: "Home" },
  { value: "/brands", label: "Brands" },
  { value: "/event", label: "Events" },
  { value: "/review", label: "Reviews" },
  { value: "/stores", label: "Stores" },
  { value: "/coupons", label: "Coupons" },
  { value: "/join", label: "Join / membership" },
  { value: "/ambassador", label: "Ambassador" },
  { value: "/b2b", label: "B2B" },
  { value: "/help", label: "Help" },
  { value: "/about", label: "About" },
  { value: "/community/notice", label: "Notice" },
  { value: "/community/qa", label: "Product Q&A" },
  { value: "/community/faq", label: "FAQ" },
] as const;

/** Kinds of storefront pages a link can point at. */
const LINK_KINDS = [
  { value: "none", label: "No link" },
  { value: "page", label: "Store page" },
  { value: "brand", label: "Brand page" },
  { value: "category", label: "Category page" },
  { value: "product", label: "Product page" },
  { value: "custom", label: "Custom URL" },
] as const;

type LinkKind = (typeof LINK_KINDS)[number]["value"];

/** What the selector needs to offer targets for each kind. */
export interface LinkFieldOptions {
  brands: { slug: string; name: string }[];
  categories: { slug: string; name: string }[];
  products: { slug: string; name: string }[];
}

/** Pull a stored href apart into the dropdown chain that produced it. */
function parseHref(href: string): { kind: LinkKind; target: string } {
  const match = /^\/(brand|category|products)\/(.+)$/.exec(href);
  if (match) {
    return {
      kind: match[1] === "products" ? "product" : (match[1] as LinkKind),
      target: match[2],
    };
  }
  if (STORE_PAGES.some((p) => p.value === href)) {
    return { kind: "page", target: href };
  }
  return href ? { kind: "custom", target: href } : { kind: "none", target: "" };
}

/** Rebuild the href from the chain (a custom URL passes through untouched). */
function buildHref(kind: LinkKind, target: string): string {
  switch (kind) {
    case "brand":
      return target ? `/brand/${target}` : "";
    case "category":
      return target ? `/category/${target}` : "";
    case "product":
      return target ? `/products/${target}` : "";
    case "page":
    case "custom":
      return target.trim();
    default:
      return "";
  }
}

export function LinkField({
  value,
  onChange,
  options,
  label = "Link (optional)",
  hint,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  options: LinkFieldOptions;
  label?: string;
  hint?: string;
  /** Show a warning when the field is empty (still optional to the schema). */
  required?: boolean;
}) {
  const { kind, target } = parseHref(value ?? "");
  const targets: { value: string; label: string }[] =
    kind === "page"
      ? STORE_PAGES.map((p) => ({ value: p.value, label: p.label }))
      : kind === "brand"
        ? options.brands.map((b) => ({ value: b.slug, label: b.name }))
        : kind === "category"
          ? options.categories.map((c) => ({ value: c.slug, label: c.name }))
          : kind === "product"
            ? options.products.map((p) => ({ value: p.slug, label: p.name }))
            : [];
  // A saved target that no longer exists (renamed slug, deleted page) is kept
  // selectable so the admin can see what the section still points at.
  const unknownTarget = target && !targets.some((t) => t.value === target);
  const selectedTarget = kind === "custom" ? "" : target;

  function changeKind(next: LinkKind) {
    if (next === "custom") {
      onChange(kind === "custom" ? value : "");
      return;
    }
    const first =
      next === "page"
        ? STORE_PAGES[0].value
        : next === "brand"
          ? options.brands[0]?.slug
          : next === "category"
            ? options.categories[0]?.slug
            : next === "product"
              ? options.products[0]?.slug
              : "";
    onChange(buildHref(next, first ?? ""));
  }

  return (
    <div>
      <span className={labelCls}>{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Link type"
          value={kind}
          onChange={(e) => changeKind(e.target.value as LinkKind)}
          className={`${inputCls} w-auto`}
        >
          {LINK_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>

        {kind !== "none" && kind !== "custom" && (
          <select
            aria-label="Link target"
            value={selectedTarget}
            onChange={(e) => onChange(buildHref(kind, e.target.value))}
            className={`${inputCls} min-w-[180px] w-auto flex-1`}
          >
            <option value="">Choose…</option>
            {unknownTarget && (
              <option value={target}>{target} (not found)</option>
            )}
            {targets.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        )}

        {kind === "custom" && (
          <input
            value={target}
            onChange={(e) => onChange(e.target.value)}
            placeholder="/help or https://…"
            className={`${inputCls} min-w-[220px] flex-1`}
          />
        )}
      </div>

      <div className="mt-1.5 flex items-center gap-2 text-xs">
        <span className="text-zinc-400">Link:</span>
        {value ? (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="truncate rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-zinc-600 hover:text-point-600"
          >
            {value}
          </a>
        ) : (
          <span className={required ? "text-amber-600" : "text-zinc-400"}>
            {required ? "No link yet — pick where this should lead." : "—"}
          </span>
        )}
      </div>
      {hint && <span className="mt-1 block text-xs text-zinc-400">{hint}</span>}
    </div>
  );
}
