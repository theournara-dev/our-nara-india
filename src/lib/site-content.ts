import type { SiteVersion } from "@/lib/site-version";
import { DEFAULT_GST_BPS, clampBps } from "@/lib/tax";

/**
 * Storefront content that admins edit per site version: the contact details
 * shown in the footer, policies and the stores page, the rotating strips pinned
 * above the header, and the store-picker popup.
 *
 * Types + defaults + normalizers live here (no server imports) so client
 * components can render the same shapes; the DB read is in `site-config.ts`.
 */

/** How a top-banner block's background is drawn. */
export type TopBannerBackgroundType = "solid" | "gradient";

/** One colour stop of a gradient background (client's store-banner feedback). */
export interface TopBannerGradientStop {
  /** Any CSS colour, normally a hex. */
  color: string;
  /** Where the stop sits along the strip, 0–100%. */
  position: number;
}

/** A strip pinned above the header — one line of text or an image. */
export type TopBannerBlock =
  | {
      id: string;
      kind: "text";
      text: string;
      /** Hex background for the strip (used when the type is solid). */
      background: string;
      /** "solid" (the default) or "gradient". */
      backgroundType?: TopBannerBackgroundType;
      /** The gradient's stops, left to right; only read for a gradient. */
      gradientStops?: TopBannerGradientStop[];
      textColor: string;
      href?: string;
    }
  | {
      id: string;
      kind: "image";
      image: string;
      alt?: string;
      href?: string;
      background: string;
      backgroundType?: TopBannerBackgroundType;
      gradientStops?: TopBannerGradientStop[];
    };

/** One store card inside the store-picker popup. */
export type SwitcherBlock = {
  id: string;
  /** Which store this card switches to. */
  store: SiteVersion;
  title: string;
  /**
   * Optional image shown instead of the title text (e.g. the KDrop wordmark
   * on the international card). The title stays for screen readers.
   */
  titleImage?: string;
  description: string;
  /** Currency hint shown in the card, e.g. "₹ INR". */
  currency: string;
  /** Optional ribbon above the title, e.g. "Fastest". */
  badge?: string;
  /** Optional flag / logo shown beside the store name. */
  icon?: string;
  image?: string;
  /** Button label, e.g. "Shop India". */
  ctaLabel: string;
  /** Hex accent for the card's border, badge and button. */
  accent: string;
};

export type SwitcherContent = {
  title: string;
  subtitle?: string;
  /**
   * Long store logo shown before the names of products available on the
   * International (K-Drop) store — on either storefront (uploaded in the
   * admin). Empty = use the bundled K-Drop file.
   */
  brandLogo: string;
  blocks: SwitcherBlock[];
  nudge: SwitcherNudge;
};

/** Built-in icons an admin can pick for the hint that points at the switcher. */
export const SWITCHER_NUDGE_ICONS = [
  "chevron",
  "arrow",
  "pointer",
  "sparkle",
] as const;
export type SwitcherNudgeIcon = (typeof SWITCHER_NUDGE_ICONS)[number];

/**
 * The hint above the store control: a bobbing badge (built-in icon or a custom
 * image the admin uploads) with an optional label. Edited in /admin/site.
 */
export type SwitcherNudge = {
  enabled: boolean;
  icon: SwitcherNudgeIcon;
  /** Custom image shown instead of the built-in icon; empty = use the icon. */
  image: string;
  /** Optional text shown beside the badge. */
  text: string;
};

/** The /brands page's own blocks (client rounds two and six). */
export type BrandsPageContent = {
  /** Height of a preview tile in pixels (default 100). */
  previewHeight: number;
  /** Columns on desktop (2–6). */
  previewColumns: number;
  /** Rows of previews shown; the rest stay in the list below. */
  previewRows: number;
  /**
   * The long banner above the group tabs, in order (up to three, one banner per
   * column — the same strip the category pages use). Picked here because the
   * page, not the banner, decides where a banner goes (client's slide 4).
   */
  longBannerIds: string[];
  /** Strip height in pixels; 0 keeps each banner's own proportions. */
  longBannerHeight: number;
  /** The promo block under the long banner; null until one is picked. */
  promoBannerId: string | null;
  /** Promo height in pixels; 0 keeps the artwork's own proportions. */
  promoHeight: number;
};

export const DEFAULT_BRANDS_PAGE: BrandsPageContent = {
  previewHeight: 100,
  previewColumns: 4,
  previewRows: 2,
  longBannerIds: [],
  longBannerHeight: 0,
  promoBannerId: null,
  promoHeight: 0,
};

const DEFAULT_TAX_RATES = { mhBps: DEFAULT_GST_BPS, otherBps: DEFAULT_GST_BPS };

export type SiteContent = {
  version: SiteVersion;
  /** Support address shown in the footer and the order emails. */
  email: string;
  phone: string;
  address: string;
  /** Delivery fee charged by this store, and when delivery becomes free. */
  shippingCents: number;
  /** Order value above which delivery is free; null = never free. */
  freeShippingOverCents: number | null;
  /** Hour (0–23) after which an order joins tomorrow's dispatch; default 3 PM. */
  dispatchCutoffHour: number;
  /** "From" block printed on this store's invoices. */
  invoice: {
    legalName: string;
    address: string;
    email: string;
    phone: string;
    taxId: string;
    note: string;
  };
  /**
   * India GST defaults in basis points (1800 = 18%), used by the local store's
   * invoices unless a product carries its own rate. The global storefront
   * charges no tax, so its row is simply unused.
   */
  taxRates: { mhBps: number; otherBps: number };
  topBanner: TopBannerBlock[];
  switcher: SwitcherContent;
  /** /brands: the preview grid's tile height, columns and rows. */
  brandsPage: BrandsPageContent;
  /**
   * The header menu's icons, by row id (`home`, `category-<slug>`, `brand`, …).
   * Empty means "every row keeps its default"; see `menu-icons.ts`.
   */
  menuIcons: Record<string, string>;
};

const DEFAULT_BANNER: TopBannerBlock[] = [
  {
    id: "b1",
    kind: "text",
    text: "Your new K-Beauty destination 🎁",
    background: "#6f2dbd",
    textColor: "#ffffff",
  },
  {
    id: "b2",
    kind: "text",
    text: "Korean beauty, now in India",
    background: "#18181b",
    textColor: "#ffffff",
  },
];

/**
 * The International (global) store's strip: the client's gradient — red to blue
 * to purple, left to right (slide: "0% #F83658 / 50% #0894FD / 100% #7920FB").
 * The same value fills the global side of the header's store selector.
 */
export const GLOBAL_STORE_GRADIENT: TopBannerGradientStop[] = [
  { color: "#F83658", position: 0 },
  { color: "#0894FD", position: 50 },
  { color: "#7920FB", position: 100 },
];

const DEFAULT_GLOBAL_BANNER: TopBannerBlock[] = [
  {
    id: "b1",
    kind: "text",
    text: "Your new K-Beauty destination 🎁",
    background: "#6f2dbd",
    backgroundType: "gradient",
    gradientStops: GLOBAL_STORE_GRADIENT,
    textColor: "#ffffff",
  },
  ...DEFAULT_BANNER.slice(1),
];

/**
 * The store picker describes both stores, so its default is identical on every
 * version; admins edit it once (the save writes both rows).
 */
const DEFAULT_SWITCHER: SwitcherContent = {
  title: "Choose your store",
  subtitle: "Shipping and pricing depend on where you are.",
  brandLogo: "",
  nudge: {
    enabled: true,
    icon: "chevron",
    image: "",
    text: "",
  },
  blocks: [
    {
      id: "s1",
      store: "local",
      title: "India",
      // The India flag leads the card (the client's mock).
      icon: "/flags/in.svg",
      description: "Ships within India",
      currency: "₹ INR",
      ctaLabel: "Shop India",
      accent: "#6f2dbd",
    },
    {
      id: "s2",
      store: "global",
      title: "KDrop",
      // The KDrop wordmark replaces the name on the international card.
      titleImage: "/kdrop-logo.png",
      description: "Direct shipping to India",
      currency: "₹ INR",
      ctaLabel: "Shop KDrop",
      accent: "#18181b",
    },
  ],
};

const LOCAL_ADDRESS =
  "One World, S.V. Road, Near N L School, Malad West, Mumbai, Maharashtra 400064";
const GLOBAL_ADDRESS =
  "Room 1816, Building B, Incheon Techno Valley U1 Center, 94, Galsan-dong, Bupyeong-gu, Incheon, Republic of Korea";

export const DEFAULT_SITE_CONTENT: Record<SiteVersion, SiteContent> = {
  local: {
    version: "local",
    email: "theournara@gmail.com",
    phone: "+91-88283-38323",
    address: LOCAL_ADDRESS,
    // Delivery is free until an admin sets a fee in /admin/site.
    shippingCents: 0,
    freeShippingOverCents: null,
    dispatchCutoffHour: 15,
    invoice: {
      legalName: "Seoulveda Trading LLP",
      address:
        "One World, S.V. Road, Near N L School, Malad West, Mumbai, Maharashtra 400064, India",
      email: "theournara@gmail.com",
      phone: "+91-88283-38323",
      taxId: "",
      note: "",
    },
    topBanner: DEFAULT_BANNER,
    switcher: DEFAULT_SWITCHER,
    brandsPage: DEFAULT_BRANDS_PAGE,
    menuIcons: {},
    taxRates: DEFAULT_TAX_RATES,
  },
  global: {
    version: "global",
    email: "tft@thefirstteam.co.kr",
    phone: "",
    address: GLOBAL_ADDRESS,
    shippingCents: 0,
    freeShippingOverCents: null,
    dispatchCutoffHour: 15,
    invoice: {
      legalName: "The Firstteam Corp",
      address:
        "Room 1816, Building B, Incheon Techno Valley U1 Center, 94, Galsan-dong, Bupyeong-gu, Incheon, Republic of Korea",
      email: "tft@thefirstteam.co.kr",
      phone: "",
      taxId: "",
      note: "",
    },
    topBanner: DEFAULT_GLOBAL_BANNER,
    switcher: DEFAULT_SWITCHER,
    brandsPage: DEFAULT_BRANDS_PAGE,
    menuIcons: {},
    taxRates: DEFAULT_TAX_RATES,
  },
};

/** Default store-picker content (shared by both versions). */
export const DEFAULT_SWITCHER_CONTENT = DEFAULT_SWITCHER;

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A stored number, clamped to its sane range; anything else falls back. */
function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * The CSS `background` a top-banner block draws: its solid colour, or its
 * gradient read left to right. Stops are sorted so the CSS never depends on the
 * order the admin typed them in. The store selector quotes the same value, which
 * is how its two halves match the strips above the header.
 */
export function topBannerBackgroundCss(
  block:
    | Pick<TopBannerBlock, "background" | "backgroundType" | "gradientStops">
    | null
    | undefined,
): string {
  const solid = block?.background?.trim() || "#18181b";
  if (block?.backgroundType !== "gradient") return solid;
  const stops = [...(block.gradientStops ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  if (stops.length < 2) return solid;
  const painted = stops.map((s) => `${s.color} ${s.position}%`).join(", ");
  // Horizontal: 0% is the left edge, 100% the right, as the client describes it.
  return `linear-gradient(90deg, ${painted})`;
}

/**
 * Parse the stored menu-icon map: row ids to icon keys. Anything that isn't a
 * short string is dropped, so a hand-written row can't reach the renderer.
 */
export function normalizeMenuIcons(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const icons: Record<string, string> = {};
  let count = 0;
  for (const [key, icon] of Object.entries(value)) {
    if (count >= 200) break;
    if (key.length === 0 || key.length > 80) continue;
    if (typeof icon !== "string" || icon.length === 0 || icon.length > 40) {
      continue;
    }
    icons[key] = icon;
    count += 1;
  }
  return icons;
}

/**
 * Parse the top-banner JSON. Blocks that have nothing to show (no text / no
 * image) are normally dropped, so a half-finished block can't render an empty
 * strip; the admin save path passes `allowEmpty` so an admin's in-progress
 * block survives a reload instead of vanishing.
 */
export function normalizeTopBanner(
  value: unknown,
  fallback: TopBannerBlock[] = DEFAULT_BANNER,
  options: { allowEmpty?: boolean } = {},
): TopBannerBlock[] {
  if (!Array.isArray(value)) return fallback;
  const blocks: TopBannerBlock[] = [];
  value.forEach((raw, i) => {
    if (!isRecord(raw)) return;
    const id = str(raw.id) || `b${i + 1}`;
    const background = str(raw.background, "#18181b") || "#18181b";
    const href = str(raw.href) || undefined;
    const backgroundType: TopBannerBackgroundType =
      raw.backgroundType === "gradient" ? "gradient" : "solid";
    const gradientStops = normalizeGradientStops(raw.gradientStops);
    if (raw.kind === "image") {
      const image = str(raw.image);
      if (!image && !options.allowEmpty) return;
      blocks.push({
        id,
        kind: "image",
        image,
        alt: str(raw.alt) || undefined,
        href,
        background,
        backgroundType,
        gradientStops,
      });
      return;
    }
    const text = str(raw.text);
    if (!text && !options.allowEmpty) return;
    blocks.push({
      id,
      kind: "text",
      text,
      background,
      backgroundType,
      gradientStops,
      textColor: str(raw.textColor, "#ffffff") || "#ffffff",
      href,
    });
  });
  return blocks.length > 0 ? blocks : fallback;
}

/** A stored gradient's stops, repaired: colours kept, positions clamped. */
function normalizeGradientStops(
  value: unknown,
): TopBannerGradientStop[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const stops = value
    .map((raw) => {
      if (!isRecord(raw)) return null;
      const color = str(raw.color).trim();
      if (!color) return null;
      return { color, position: clampNumber(raw.position, 0, 100, 0) };
    })
    .filter((stop): stop is TopBannerGradientStop => stop !== null)
    .slice(0, 6);
  // A gradient needs two stops to be a gradient at all.
  return stops.length >= 2 ? stops : undefined;
}

/** Parse the store-picker JSON, falling back per missing piece. */
export function normalizeSwitcher(
  value: unknown,
  fallback: SwitcherContent = DEFAULT_SWITCHER,
): SwitcherContent {
  if (!isRecord(value)) return fallback;
  const rawBlocks = Array.isArray(value.blocks) ? value.blocks : null;
  if (!rawBlocks) return fallback;

  const blocks: SwitcherBlock[] = [];
  rawBlocks.forEach((raw, i) => {
    if (!isRecord(raw)) return;
    const store = raw.store === "global" ? "global" : "local";
    const def =
      fallback.blocks.find((b) => b.store === store) ?? fallback.blocks[0];
    blocks.push({
      id: str(raw.id) || `${store}-${i + 1}`,
      store,
      title: str(raw.title, def?.title ?? store),
      titleImage: str(raw.titleImage) || undefined,
      description: str(raw.description, def?.description ?? ""),
      currency: str(raw.currency, def?.currency ?? "₹ INR"),
      badge: str(raw.badge) || undefined,
      icon: str(raw.icon) || undefined,
      image: str(raw.image) || undefined,
      ctaLabel: str(raw.ctaLabel, def?.ctaLabel ?? "Shop"),
      accent: str(raw.accent, def?.accent ?? "#6f2dbd"),
    });
  });

  const rawNudge = isRecord(value.nudge) ? value.nudge : {};
  const defNudge = fallback.nudge;
  const nudgeIcon = SWITCHER_NUDGE_ICONS.includes(
    rawNudge.icon as SwitcherNudgeIcon,
  )
    ? (rawNudge.icon as SwitcherNudgeIcon)
    : defNudge.icon;
  const nudge: SwitcherNudge = {
    enabled:
      typeof rawNudge.enabled === "boolean"
        ? rawNudge.enabled
        : defNudge.enabled,
    icon: nudgeIcon,
    image: str(rawNudge.image, defNudge.image),
    text: str(rawNudge.text, defNudge.text),
  };

  return {
    title: str(value.title, fallback.title),
    subtitle: str(value.subtitle) || undefined,
    brandLogo: str(value.brandLogo, fallback.brandLogo),
    blocks: blocks.length > 0 ? blocks : fallback.blocks,
    nudge,
  };
}

/** Merge a stored row over the defaults for that version. */
export function siteContentFromRow(
  version: SiteVersion,
  row: {
    email: string | null;
    phone: string | null;
    address: string | null;
    shippingCents: number | null;
    freeShippingOverCents: number | null;
    dispatchCutoffHour: number | null;
    invoiceLegalName: string | null;
    invoiceAddress: string | null;
    invoiceEmail: string | null;
    invoicePhone: string | null;
    invoiceTaxId: string | null;
    invoiceNote: string | null;
    topBanner: unknown;
    switcher: unknown;
    menuIcons: unknown;
    brandsPreviewHeight: number | null;
    brandsPreviewColumns: number | null;
    brandsPreviewRows: number | null;
    /** The directory's own blocks: long banner ids, heights, promo pick. */
    brandsLongBannerIds: string[];
    brandsLongBannerHeight: number;
    brandsPromoBannerId: string | null;
    brandsPromoHeight: number;
    taxRateMhBps: number | null;
    taxRateOtherBps: number | null;
  } | null,
): SiteContent {
  const base = DEFAULT_SITE_CONTENT[version];
  if (!row) return base;
  return {
    version,
    email: row.email?.trim() || base.email,
    phone: row.phone?.trim() ?? base.phone,
    address: row.address?.trim() || base.address,
    shippingCents: row.shippingCents ?? base.shippingCents,
    freeShippingOverCents: row.freeShippingOverCents ?? null,
    dispatchCutoffHour: row.dispatchCutoffHour ?? base.dispatchCutoffHour,
    invoice: {
      legalName: row.invoiceLegalName?.trim() || base.invoice.legalName,
      address: row.invoiceAddress?.trim() || base.invoice.address,
      email: row.invoiceEmail?.trim() || base.invoice.email,
      phone: row.invoicePhone?.trim() ?? base.invoice.phone,
      taxId: row.invoiceTaxId?.trim() ?? base.invoice.taxId,
      note: row.invoiceNote?.trim() ?? base.invoice.note,
    },
    // A stored (even empty) banner wins over the defaults: clearing every block
    // in the admin hides the strip instead of bringing the defaults back.
    topBanner:
      row.topBanner == null
        ? base.topBanner
        : normalizeTopBanner(row.topBanner, []),
    switcher: normalizeSwitcher(row.switcher, base.switcher),
    menuIcons: normalizeMenuIcons(row.menuIcons),
    // The /brands preview grid, clamped to sane ranges; anything missing falls
    // back to the defaults (100px tiles, 4 columns × 2 rows).
    brandsPage: {
      previewHeight: clampNumber(
        row.brandsPreviewHeight,
        40,
        600,
        base.brandsPage.previewHeight,
      ),
      previewColumns: clampNumber(
        row.brandsPreviewColumns,
        2,
        6,
        base.brandsPage.previewColumns,
      ),
      previewRows: clampNumber(
        row.brandsPreviewRows,
        1,
        10,
        base.brandsPage.previewRows,
      ),
      longBannerIds: (row.brandsLongBannerIds ?? base.brandsPage.longBannerIds)
        .filter(Boolean)
        .slice(0, 3),
      longBannerHeight: clampNumber(
        row.brandsLongBannerHeight,
        0,
        600,
        base.brandsPage.longBannerHeight,
      ),
      promoBannerId: row.brandsPromoBannerId ?? null,
      promoHeight: clampNumber(
        row.brandsPromoHeight,
        0,
        600,
        base.brandsPage.promoHeight,
      ),
    },
    // India GST defaults (basis points); anything unusable falls back to 18%.
    taxRates: {
      mhBps: clampBps(row.taxRateMhBps) ?? base.taxRates.mhBps,
      otherBps: clampBps(row.taxRateOtherBps) ?? base.taxRates.otherBps,
    },
  };
}
