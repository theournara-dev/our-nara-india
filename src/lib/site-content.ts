import type { SiteVersion } from "@/lib/site-version";

/**
 * Storefront content that admins edit per site version: the contact details
 * shown in the footer and policies, the rotating strips pinned above the
 * header, and the store-picker popup.
 *
 * Types + defaults + normalizers live here (no server imports) so client
 * components can render the same shapes; the DB read is in `site-config.ts`.
 */

/** A strip pinned above the header — one line of text or an image. */
export type TopBannerBlock =
  | {
      id: string;
      kind: "text";
      text: string;
      /** Hex background for the strip. */
      background: string;
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
    };

/** One store card inside the store-picker popup. */
export type SwitcherBlock = {
  id: string;
  /** Which store this card switches to. */
  store: SiteVersion;
  title: string;
  description: string;
  /** Currency hint shown in the card, e.g. "₹ INR". */
  currency: string;
  /** Optional ribbon above the title, e.g. "Fastest". */
  badge?: string;
  image?: string;
  /** Button label, e.g. "Shop India". */
  ctaLabel: string;
  /** Hex accent for the card's border, badge and button. */
  accent: string;
};

export type SwitcherContent = {
  title: string;
  subtitle?: string;
  blocks: SwitcherBlock[];
};

export type SiteContent = {
  version: SiteVersion;
  /** Support address shown in the footer and the order emails. */
  email: string;
  phone: string;
  address: string;
  topBanner: TopBannerBlock[];
  switcher: SwitcherContent;
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
 * The store picker describes both stores, so its default is identical on every
 * version; admins edit it once (the save writes both rows).
 */
const DEFAULT_SWITCHER: SwitcherContent = {
  title: "Choose your store",
  subtitle: "Shipping and pricing depend on where you are.",
  blocks: [
    {
      id: "s1",
      store: "local",
      title: "India",
      description: "Ships within India",
      currency: "₹ INR",
      ctaLabel: "Shop India",
      accent: "#6f2dbd",
    },
    {
      id: "s2",
      store: "global",
      title: "KDrop",
      description: "Direct shipping to India",
      currency: "₹ INR",
      ctaLabel: "Shop KDrop",
      accent: "#18181b",
    },
  ],
};

export const DEFAULT_SITE_CONTENT: Record<SiteVersion, SiteContent> = {
  local: {
    version: "local",
    email: "theournara@gmail.com",
    phone: "+91-88283-38323",
    address:
      "One World, S.V. Road, Near N L School, Malad West, Mumbai, Maharashtra 400064",
    topBanner: DEFAULT_BANNER,
    switcher: DEFAULT_SWITCHER,
  },
  global: {
    version: "global",
    email: "tft@thefirstteam.co.kr",
    phone: "",
    address:
      "Room 1816, Building B, Incheon Techno Valley U1 Center, 94, Galsan-dong, Bupyeong-gu, Incheon, Republic of Korea",
    topBanner: DEFAULT_BANNER,
    switcher: DEFAULT_SWITCHER,
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
      textColor: str(raw.textColor, "#ffffff") || "#ffffff",
      href,
    });
  });
  return blocks.length > 0 ? blocks : fallback;
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
      description: str(raw.description, def?.description ?? ""),
      currency: str(raw.currency, def?.currency ?? "₹ INR"),
      badge: str(raw.badge) || undefined,
      image: str(raw.image) || undefined,
      ctaLabel: str(raw.ctaLabel, def?.ctaLabel ?? "Shop"),
      accent: str(raw.accent, def?.accent ?? "#6f2dbd"),
    });
  });

  return {
    title: str(value.title, fallback.title),
    subtitle: str(value.subtitle) || undefined,
    blocks: blocks.length > 0 ? blocks : fallback.blocks,
  };
}

/** Merge a stored row over the defaults for that version. */
export function siteContentFromRow(
  version: SiteVersion,
  row: {
    email: string | null;
    phone: string | null;
    address: string | null;
    topBanner: unknown;
    switcher: unknown;
  } | null,
): SiteContent {
  const base = DEFAULT_SITE_CONTENT[version];
  if (!row) return base;
  return {
    version,
    email: row.email?.trim() || base.email,
    phone: row.phone?.trim() ?? base.phone,
    address: row.address?.trim() || base.address,
    // A stored (even empty) banner wins over the defaults: clearing every block
    // in the admin hides the strip instead of bringing the defaults back.
    topBanner:
      row.topBanner == null
        ? base.topBanner
        : normalizeTopBanner(row.topBanner, []),
    switcher: normalizeSwitcher(row.switcher, base.switcher),
  };
}
