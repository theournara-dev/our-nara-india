"use client";

// Section configs are dynamic per type, so the config payload is intentionally
// loosely typed in the form layer.
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  AmbassadorImagesField,
  HeroSlidesField,
  InstagramItemsField,
  MoreLinkField,
  NumberField,
  ProductSourceField,
  SelectField,
  ShowcaseBannersField,
  ShowcaseTabsField,
  ShortsItemsField,
  TextField,
  TripleBannerBoxesField,
  type SectionFormOptions,
} from "./fields";
import { LONG_BANNER_NONE } from "@/lib/page-builder/types";

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
  // Sections saved before the cell split carry a carousel selection; show its
  // first two entries in the cells so editing never loses them.
  const legacy: string[] = config.bannerIds ?? [];
  const cells: { id: string; bannerId: string }[] =
    config.cells && config.cells.length > 0
      ? config.cells
      : [
          { id: "cell-1", bannerId: legacy[0] ?? "" },
          { id: "cell-2", bannerId: legacy[1] ?? "" },
        ];
  const longBanners = options.banners.filter((b) => b.placement === "long");

  function setCell(index: number, bannerId: string) {
    const next = cells.map((cell, i) =>
      i === index ? { ...cell, bannerId } : cell,
    );
    onChange({ ...config, cells: next, bannerIds: [] });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 [&>*]:min-w-0 sm:grid-cols-2">
        {cells.map((cell, i) => (
          <SelectField
            key={cell.id}
            label={`Cell ${i + 1} banner`}
            value={cell.bannerId}
            onChange={(v) => setCell(i, v)}
            options={[
              { value: "", label: "Automatic (next free banner)" },
              { value: LONG_BANNER_NONE, label: "None (hide this cell)" },
              ...longBanners.map((b) => ({ value: b.id, label: b.title })),
            ]}
          />
        ))}
      </div>
      <p className="text-xs leading-5 text-zinc-400">
        The two cells sit side by side on desktop (stacked on phones). Each
        shows one banner from the Banners admin — a cell left on
        &quot;Automatic&quot; takes the next active &quot;Long banner&quot; no
        other cell uses. Choose &quot;None&quot; to hide a cell; setting both to
        &quot;None&quot; hides the whole section.
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
/**
 * The tabbed showcase (the client's slide 2): every filter is attached to a
 * brand and swaps the full-width banner plus that brand's chosen products.
 */
export function TabbedShowcaseForm({ config, onChange, options }: FormProps) {
  return (
    <div className="space-y-4">
      <TextField
        label="Title (optional)"
        value={config.title ?? ""}
        onChange={(title) => onChange({ ...config, title })}
        placeholder="e.g. Shop by brand"
      />
      <p className="text-xs leading-5 text-zinc-400">
        Sits above the filters. Leave it empty (the default) and nothing is
        shown.
      </p>
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
          label="Default columns"
          value={config.columns ?? 4}
          min={2}
          max={6}
          onChange={(columns) => onChange({ ...config, columns })}
          hint="Used by filters that don't set their own."
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

export function AmbassadorForm({ config, onChange, options }: FormProps) {
  return (
    <div className="space-y-4">
      <AmbassadorImagesField
        value={config.images ?? []}
        onChange={(images) => onChange({ ...config, images })}
        options={options}
      />
      <TextField
        label="Form heading"
        value={config.formTitle ?? ""}
        onChange={(formTitle) => onChange({ ...config, formTitle })}
      />
      <TextField
        label="Form introduction"
        value={config.formIntro ?? ""}
        onChange={(formIntro) => onChange({ ...config, formIntro })}
        hint="Shown under the heading, above the fields."
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
