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
