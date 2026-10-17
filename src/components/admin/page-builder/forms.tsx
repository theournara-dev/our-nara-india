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
import {
  growLongBannerSlots,
  longBannerCellBox,
  normalizeLongBannerSlots,
  resolveLongBannerCells,
  LONG_BANNER_PREVIEW_RADIUS,
  type LongBannerSlot,
} from "@/lib/long-banner";
import { BannerArtwork } from "@/components/banners/banner-artwork";

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
  const columns: number = Math.min(Math.max(config.columns ?? 2, 1), 3);
  const height: number = config.height ?? 0;
  // The stored slots, never fewer than the section's own column count — the
  // same normalisation the storefront loader uses, so both see the identical
  // columns. Picks kept for slots beyond the current count stay in the config.
  const stored = Math.max(
    config.cells?.length ?? 0,
    (config.bannerIds ?? []).length,
  );
  const cells: LongBannerSlot[] = normalizeLongBannerSlots(
    config,
    Math.max(columns, stored),
  );
  /** The slots the pickers and the preview show: the visible columns only. */
  const shown = cells.slice(0, columns);

  /** The exact banners the columns will show, following the loader's rules. */
  function resolveSlots() {
    // One shared resolver, so the preview cannot drift from the page: the pool
    // is what the loader draws from (active banners inside their schedule),
    // picked columns win, "automatic" columns fill in order.
    const pool = options.banners.filter((b) => b.live);
    return resolveLongBannerCells(shown, pool);
  }

  function setColumn(next: number) {
    onChange({
      ...config,
      // Keep what the extra slots already held, so raising and lowering the
      // count never quietly loses a chosen banner.
      cells: growLongBannerSlots(cells, next),
      columns: next,
      bannerIds: [],
    });
  }

  function setCell(index: number, bannerId: string) {
    const next = cells.map((cell, i) =>
      i === index ? { ...cell, bannerId } : cell,
    );
    onChange({ ...config, cells: next, bannerIds: [] });
  }

  const preview = resolveSlots().filter((slot) => slot.banner);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 [&>*]:min-w-0 sm:grid-cols-3">
        <NumberField
          label="Columns"
          value={columns}
          min={1}
          max={3}
          onChange={setColumn}
          hint="1–3 across on desktop; phones stack them."
        />
        <NumberField
          label="Height (px)"
          value={height}
          min={0}
          max={600}
          onChange={(h) => onChange({ ...config, height: h })}
          hint="0 keeps each banner's own proportions."
        />
      </div>

      <div className="grid gap-3 [&>*]:min-w-0 sm:grid-cols-3">
        {shown.map((cell, i) => (
          <SelectField
            key={cell.id}
            label={`Column ${i + 1} banner`}
            value={cell.bannerId}
            onChange={(v) => setCell(i, v)}
            options={[
              { value: "", label: "Automatic (next free banner)" },
              { value: LONG_BANNER_NONE, label: "None (hide this column)" },
              ...options.banners.map((b) => ({
                value: b.id,
                label: b.live ? b.title : `${b.title} (hidden)`,
              })),
            ]}
          />
        ))}
      </div>

      <p className="text-xs leading-5 text-zinc-400">
        A column left on &quot;Automatic&quot; takes the next active banner no
        other column uses. Choose &quot;None&quot; to hide a column — the others
        take its width; every column on &quot;None&quot; hides the whole
        section. A pick made for a column you later hide is kept for when it
        comes back.
      </p>

      {/* What the section will look like, at the width and height it will
          actually render (client's slide 3). */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
        <p className="mb-2 text-xs font-medium text-zinc-500">
          Preview — {columns} column{columns === 1 ? "" : "s"}
          {height > 0 ? ` at ${height}px` : " at each banner's own proportions"}
        </p>
        {preview.length === 0 ? (
          <p className="py-6 text-center text-xs text-zinc-400">
            Nothing to show — every column is on &quot;None&quot;.
          </p>
        ) : (
          <div
            className="flex w-full flex-col gap-[10px] md:flex-row"
            // One query container per strip, so the cells can quote their
            // corner as a share of it (LONG_BANNER_PREVIEW_RADIUS).
            style={{ containerType: "inline-size" }}
          >
            {preview.map(({ id, banner }) => (
              <div
                key={id}
                // Auto height uses the storefront cell's own classes, so the
                // shape is the page's shape by construction; a pinned height
                // keeps the column's share of the content column at the widest
                // the page goes — the same box the banner editor quotes.
                className={`relative w-full overflow-hidden rounded-md bg-white ${
                  height > 0 ? "" : "aspect-[800/210] md:aspect-[2172/260]"
                } ${
                  preview.length > 1
                    ? preview.length === 2
                      ? "md:w-1/2"
                      : "md:w-1/3"
                    : ""
                }`}
                style={{
                  // The live 16px corner at the preview's own scale (the
                  // rounded-md above is the fallback for older engines).
                  borderRadius: LONG_BANNER_PREVIEW_RADIUS,
                  ...(height > 0
                    ? {
                        aspectRatio: `${longBannerCellBox(columns, height).width} / ${height}`,
                      }
                    : {}),
                }}
              >
                <BannerArtwork
                  banner={{
                    image: banner!.image,
                    mobileImage: banner!.mobileImage,
                    alt: banner!.alt,
                    style: banner!.style,
                    heading: banner!.heading,
                    subheading: banner!.subheading,
                    textAlign: banner!.textAlign,
                    textVAlign: banner!.textVAlign,
                    textColor: banner!.textColor,
                    scrim: banner!.scrim,
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
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
  const columns = config.columns ?? 4;
  const rows = config.rows ?? 2;
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
      <div className="grid gap-3 [&>*]:min-w-0 sm:grid-cols-3">
        <NumberField
          label="Columns"
          value={columns}
          min={2}
          max={6}
          onChange={(value) => onChange({ ...config, columns: value })}
          hint="Fixed for every filter — 5 really is five across."
        />
        <NumberField
          label="Rows"
          value={rows}
          min={1}
          max={5}
          onChange={(value) => onChange({ ...config, rows: value })}
          hint={`Each filter fills ${columns} × ${rows} = ${columns * rows} slots.`}
        />
        <NumberField
          label="Banner height (px)"
          value={config.height ?? 400}
          min={80}
          max={1200}
          onChange={(height) => onChange({ ...config, height })}
          hint="Every tab's banner renders at this height."
        />
      </div>
      <ShowcaseTabsField
        value={config.tabs ?? []}
        onChange={(tabs) => onChange({ ...config, tabs })}
        options={options}
        columns={columns}
        rows={rows}
      />
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
