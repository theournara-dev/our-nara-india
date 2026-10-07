"use client";

// Section configs are dynamic per type, so the config payload is intentionally
// loosely typed in the form layer.
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  BannersField,
  HeroSlidesField,
  InstagramItemsField,
  NumberField,
  ProductSourceField,
  SelectField,
  ShortsItemsField,
  TextField,
  TripleBannerBoxesField,
  type SectionFormOptions,
} from "./fields";
import { ThemeProductCard } from "@/components/theme/product-card";
import type { ProductCardView } from "@/data/catalog";
import type { ProductSource } from "@/lib/page-builder/types";

/**
 * Per-type admin forms. Each receives the section's current `config` and an
 * `onChange` to update it (the parent dialog owns the config state and saves
 * it via a server action). Types without settings render a static note.
 */

type FormProps = {
  config: any;
  onChange: (config: any) => void;
  options: SectionFormOptions;
};

function NoSettings() {
  return (
    <p className="text-sm text-zinc-400">
      This section has no configurable settings.
    </p>
  );
}

/**
 * Resolve the products a "Products" section will render, mirroring the server
 * loader: filter by the chosen source, order newest-first (as the storefront
 * sources do) and cap at `columns × rows` for grids.
 */
function previewProducts(
  options: SectionFormOptions,
  source: ProductSource | undefined,
  columns: number,
  rows: number,
  layout: string,
): ProductCardView[] {
  const all = options.products ?? [];
  let list = all;
  let take = all.length;

  switch (source?.kind) {
    case "brand":
      list = all.filter((p) => p.brandSlug === source.slug);
      take = source.take;
      break;
    case "category":
      list = all.filter((p) => p.categorySlug === source.slug);
      take = source.take;
      break;
    case "pre-order":
      list = all.filter((p) => p.isPreOrder);
      take = source.take;
      break;
    case "available-now":
      list = all.filter((p) => !p.isPreOrder);
      take = source.take;
      break;
    case "slugs": {
      const order = new Map(source.slugs.map((s, i) => [s, i] as const));
      list = all
        .filter((p) => order.has(p.slug))
        .sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
      take = list.length;
      break;
    }
    default:
      // "featured" (and an unset source): newest first.
      break;
  }

  if (source?.kind !== "slugs") {
    list = [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  const limit = layout === "grid" ? columns * rows : take;
  return list.slice(0, Math.min(limit, take)).map((p) => ({
    id: p.slug,
    slug: p.slug,
    name: p.name,
    summary: p.summary,
    shortTags: p.shortTags,
    priceCents: p.priceCents,
    currency: p.currency,
    isPreOrder: p.isPreOrder,
    preOrderNotice: p.preOrderNotice,
    images: [p.image, p.hoverImage].filter(Boolean) as string[],
    hoverImage: p.hoverImage ?? p.image,
    brand: { slug: p.brandSlug, name: p.brandName },
  }));
}

/** Storefront-style item preview for the Products section editor. */
function ItemPreview({
  options,
  source,
  columns,
  rows,
  layout,
}: {
  options: SectionFormOptions;
  source: ProductSource | undefined;
  columns: number;
  rows: number;
  layout: string;
}) {
  const items = previewProducts(options, source, columns, rows, layout);
  const capacity = layout === "grid" ? columns * rows : null;

  return (
    <div className="border-t border-zinc-100 pt-4">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Item preview
      </h3>
      <p className="mb-3 text-xs text-zinc-400">
        {capacity
          ? `How each item renders on the storefront — up to ${columns} × ${rows} = ${capacity} products.`
          : "How each item renders in the storefront carousel."}
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-zinc-400">
          No products match this source yet.
        </p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {items.map((product) => (
            <div key={product.slug} className="w-[168px] shrink-0">
              <ThemeProductCard preview product={product} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function HeroForm({ config, onChange, options }: FormProps) {
  return (
    <HeroSlidesField
      value={config.slides ?? []}
      onChange={(slides) => onChange({ ...config, slides })}
      options={options}
    />
  );
}

export function ShortsForm({ config, onChange }: FormProps) {
  return (
    <ShortsItemsField
      value={config.items ?? []}
      onChange={(items) => onChange({ ...config, items })}
    />
  );
}

export function LongBannerForm({ config, onChange, options }: FormProps) {
  return (
    <div className="space-y-3">
      <BannersField
        value={config.bannerIds ?? []}
        onChange={(bannerIds) => onChange({ ...config, bannerIds })}
        options={options}
      />
      <p className="text-xs leading-5 text-zinc-400">
        Leave empty to automatically show all active &quot;Long banner&quot;
        banners from the Banners admin.
      </p>
    </div>
  );
}

export function ReviewsForm() {
  return <NoSettings />;
}

export function InstagramForm({ config, onChange }: FormProps) {
  return (
    <InstagramItemsField
      value={config.items ?? []}
      onChange={(items) => onChange({ ...config, items })}
    />
  );
}

export function ProductShowcaseForm({ config, onChange, options }: FormProps) {
  const layout = config.layout ?? "grid";
  return (
    <div className="space-y-4">
      <TextField
        label="Sub heading"
        value={config.sub ?? ""}
        onChange={(sub) => onChange({ ...config, sub })}
        placeholder="e.g. TOP PICKS"
      />
      <TextField
        label="Title"
        value={config.title ?? ""}
        onChange={(title) => onChange({ ...config, title })}
        placeholder="e.g. BEST PRODUCT"
      />
      <ProductSourceField
        value={config.source}
        onChange={(source) => onChange({ ...config, source })}
        options={options}
      />
      <SelectField
        label="Layout"
        value={layout}
        onChange={(v) => onChange({ ...config, layout: v })}
        options={[
          { value: "grid", label: "Grid — wraps into rows" },
          { value: "carousel", label: "Carousel — scrolls horizontally" },
        ]}
      />
      <NumberField
        label="Columns"
        value={config.columns ?? 5}
        min={1}
        max={6}
        onChange={(columns) => onChange({ ...config, columns })}
      />
      {layout === "grid" && (
        <>
          <NumberField
            label="Max rows"
            value={config.rows ?? 2}
            min={1}
            max={10}
            onChange={(rows) => onChange({ ...config, rows })}
            hint="A grid shows at most columns × rows products. The rest stay behind the “more” link."
          />
          <TextField
            label="More link (optional)"
            value={config.moreHref ?? ""}
            onChange={(moreHref) => onChange({ ...config, moreHref })}
            placeholder="/category/pre-order"
          />
          <TextField
            label="More label (optional)"
            value={config.moreLabel ?? ""}
            onChange={(moreLabel) => onChange({ ...config, moreLabel })}
            placeholder="MORE PRODUCTS →"
          />
        </>
      )}

      <ItemPreview
        options={options}
        source={config.source}
        columns={config.columns ?? 5}
        rows={config.rows ?? 2}
        layout={layout}
      />
    </div>
  );
}

export function TripleBannerForm({ config, onChange, options }: FormProps) {
  return (
    <TripleBannerBoxesField
      value={config.boxes ?? []}
      onChange={(boxes) => onChange({ ...config, boxes })}
      options={options}
    />
  );
}
