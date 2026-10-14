"use client";

// Section configs are dynamic per type, so the config payload is intentionally
// loosely typed in the form layer.
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  BannersField,
  HeroSlidesField,
  InstagramItemsField,
  MoreLinkField,
  NumberField,
  ProductSourceField,
  SelectField,
  ShortsItemsField,
  ShowcaseBannersField,
  ShowcaseTabsField,
  TextField,
  TripleBannerBoxesField,
  type SectionFormOptions,
} from "./fields";

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
  // Sections saved before the block split carry only `bannerIds`; show them as
  // the first block so editing never loses the old selection.
  const rows: { id: string; bannerIds: string[] }[] =
    config.rows && config.rows.length > 0
      ? config.rows
      : [{ id: "block-1", bannerIds: config.bannerIds ?? [] }];

  function updateRows(next: { id: string; bannerIds: string[] }[]) {
    // Keep the legacy field in step with the first block for older readers.
    onChange({ ...config, rows: next, bannerIds: next[0]?.bannerIds ?? [] });
  }

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={row.id} className="rounded-lg border border-zinc-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700">
              Banner block {i + 1}
            </span>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => updateRows(rows.filter((r) => r.id !== row.id))}
                className="text-xs font-medium text-red-500 hover:underline"
              >
                Remove
              </button>
            )}
          </div>
          <BannersField
            label={`Banners in block ${i + 1}`}
            value={row.bannerIds}
            onChange={(bannerIds) =>
              updateRows(
                rows.map((r) => (r.id === row.id ? { ...r, bannerIds } : r)),
              )
            }
            options={options}
          />
        </div>
      ))}
      {rows.length < 4 && (
        <button
          type="button"
          onClick={() =>
            updateRows([
              ...rows,
              { id: `block-${rows.length + 1}-${Date.now()}`, bannerIds: [] },
            ])
          }
          className="inline-flex h-9 items-center justify-center rounded border border-dashed border-zinc-300 px-3 text-sm font-medium text-zinc-600 hover:border-point-500 hover:text-point-500"
        >
          + Add block
        </button>
      )}
      <p className="text-xs leading-5 text-zinc-400">
        Each block renders its own full-width carousel. A block left empty shows
        every active &quot;Long banner&quot; from the Banners admin — assign
        specific banners when you use more than one block.
      </p>
    </div>
  );
}

export function ReviewsForm() {
  return <NoSettings />;
}

/**
 * The tabbed showcase (the client's slide 5): every tab is a category that
 * swaps the panel — a linked banner plus curated products.
 */
export function TabbedShowcaseForm({ config, onChange, options }: FormProps) {
  return (
    <div className="space-y-4">
      <ShowcaseTabsField
        value={config.tabs ?? []}
        onChange={(tabs) => onChange({ ...config, tabs })}
        options={options}
      />
      <div className="grid gap-3 [&>*]:min-w-0 sm:grid-cols-2">
        <NumberField
          label="Banner height (px)"
          value={config.height ?? 400}
          min={80}
          max={1200}
          onChange={(height) => onChange({ ...config, height })}
          hint="Every tab's banner renders at this height."
        />
        <NumberField
          label="Columns"
          value={config.columns ?? 4}
          min={2}
          max={6}
          onChange={(columns) => onChange({ ...config, columns })}
        />
      </div>
      <MoreLinkField
        value={config.moreHref ?? ""}
        onChange={(moreHref) => onChange({ ...config, moreHref })}
        options={options}
        hint="Optional button under every tab's products."
      />
      <TextField
        label="More label (optional)"
        value={config.moreLabel ?? ""}
        onChange={(moreLabel) => onChange({ ...config, moreLabel })}
        placeholder="VIEW MORE →"
      />
    </div>
  );
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
          <MoreLinkField
            value={config.moreHref ?? ""}
            onChange={(moreHref) => onChange({ ...config, moreHref })}
            options={options}
            hint="Pick where the “more” button goes — the URL is built for you."
          />
          <TextField
            label="More label (optional)"
            value={config.moreLabel ?? ""}
            onChange={(moreLabel) => onChange({ ...config, moreLabel })}
            placeholder="MORE PRODUCTS →"
          />
        </>
      )}
      <ShowcaseBannersField
        value={config.banners ?? []}
        onChange={(banners) => onChange({ ...config, banners })}
        options={options}
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
