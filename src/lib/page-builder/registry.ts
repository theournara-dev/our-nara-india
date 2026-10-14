import "server-only";
import type { ComponentType } from "react";
import { AmbassadorSection } from "@/components/ambassador/ambassador-section";
import { HeroCarousel } from "@/components/content/hero-carousel";
import { InstagramSection } from "@/components/content/instagram-section";
import { LongBannerCells } from "@/components/content/long-banner";
import { ReviewsSection } from "@/components/content/reviews-section";
import { ShortsCarousel } from "@/components/content/shorts-carousel";
import { TripleBanner } from "@/components/content/triple-banner";
import { ProductShowcase } from "@/components/theme/product-showcase";
import { TabbedShowcase } from "@/components/content/tabbed-showcase";
import { getLongBanners } from "@/data/banners";
import type { ProductCard } from "@/data/products";
import {
  getAvailableNow,
  getFeaturedProducts,
  getPreOrderProducts,
  getProductPickerOptions,
  getProductsByBrandSlug,
  getProductsByCategorySlug,
  getProductsBySlugs,
} from "@/data/products";
import {
  DEFAULT_AMBASSADOR_FORM_INTRO,
  DEFAULT_AMBASSADOR_FORM_TITLE,
  SECTION_TYPE_META_BY_TYPE,
  type AmbassadorImageConfig,
  type HeroSlide,
  type InstagramItem,
  type ProductSource,
  type SectionType,
  type SectionTypeMeta,
  type ShortItem,
  type ShowcaseBanner,
  type ShowcaseTab,
} from "./types";
import { getRequestSiteVersion } from "@/lib/site-version.server";

/**
 * Server-side section-type registry. Maps each section type to its renderer
 * component and a `load(config)` that fetches the props the renderer needs.
 * The storefront renderer iterates this registry to build a page.
 */

async function loadProducts(source: ProductSource): Promise<ProductCard[]> {
  // Curated storefront sections follow the requesting store, so a product
  // hidden on one storefront never leaks into the other's page.
  const version = await getRequestSiteVersion();
  switch (source.kind) {
    case "featured":
      return getFeaturedProducts(source.take, version);
    case "pre-order":
      return getPreOrderProducts(source.take, version);
    case "available-now":
      return getAvailableNow(source.take, version);
    case "brand":
      return getProductsByBrandSlug(source.slug, source.take, version);
    case "category":
      return getProductsByCategorySlug(source.slug, source.take, version);
    case "slugs":
      return getProductsBySlugs(source.slugs, version);
  }
}

export interface SectionTypeServer {
  meta: SectionTypeMeta;
  load: (config: unknown) => Promise<Record<string, unknown>>;
  // Dynamic registry: each type's component accepts whatever props its `load`
  // returns, so the props type can't be narrowed to a single shape.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<any>;
}

export const SECTION_TYPES: Record<SectionType, SectionTypeServer> = {
  hero: {
    meta: SECTION_TYPE_META_BY_TYPE.hero,
    load: async (config) => {
      const slides = (config as { slides?: HeroSlide[] })?.slides ?? [];
      return { slides };
    },
    component: HeroCarousel,
  },
  "product-showcase": {
    meta: SECTION_TYPE_META_BY_TYPE["product-showcase"],
    load: async (config) => {
      const c = config as {
        sub?: string;
        title: string;
        source: ProductSource;
        layout?: "grid" | "carousel";
        columns?: number;
        rows?: number;
        moreHref?: string;
        moreLabel?: string;
        banners?: ShowcaseBanner[];
      };
      const layout = c.layout ?? "grid";
      const columns = c.columns ?? 5;
      const rows = c.rows ?? 2;
      const products = await loadProducts(c.source);
      return {
        sub: c.sub,
        title: c.title,
        // A grid never renders more than `columns × rows` items; the rest stay
        // reachable through the "more" link.
        products:
          layout === "grid" ? products.slice(0, columns * rows) : products,
        layout,
        columns,
        moreHref: c.moreHref,
        moreLabel: c.moreLabel,
        banners: c.banners ?? [],
      };
    },
    component: ProductShowcase,
  },
  shorts: {
    meta: SECTION_TYPE_META_BY_TYPE.shorts,
    load: async (config) => {
      const items = (config as { items?: ShortItem[] })?.items ?? [];
      return {
        picks: items.map((item, i) => ({
          id: item.id,
          title: item.title ?? "",
          videoUrl: item.videoUrl ?? "",
          videoFile: item.videoFile,
          posterUrl: item.posterUrl,
          productHref: item.productHref,
          productImage: item.productImage,
          brand: item.brand,
          shortTags: item.shortTags,
          priceCents: item.priceCents,
          currency: item.currency,
          sortOrder: i,
          isActive: true,
        })),
      };
    },
    component: ShortsCarousel,
  },
  "triple-banner": {
    meta: SECTION_TYPE_META_BY_TYPE["triple-banner"],
    load: async (config) => {
      const c = config as { boxes?: { productSlugs: string[] }[] };
      const version = await getRequestSiteVersion();
      return {
        boxes: await Promise.all(
          (c.boxes ?? []).map(async (box) => ({
            ...box,
            products: await getProductsBySlugs(box.productSlugs, version),
          })),
        ),
      };
    },
    component: TripleBanner,
  },
  "long-banner": {
    meta: SECTION_TYPE_META_BY_TYPE["long-banner"],
    load: async (config) => {
      const c = config as {
        cells?: { id: string; bannerId?: string }[];
        bannerIds?: string[];
      };
      // Sections stored before the cell split carry a carousel selection —
      // fold its first two entries into the two cells so old pages render.
      const cells =
        c.cells && c.cells.length > 0
          ? c.cells
          : [
              { id: "cell-1", bannerId: c.bannerIds?.[0] ?? "" },
              { id: "cell-2", bannerId: c.bannerIds?.[1] ?? "" },
            ];
      const all = await getLongBanners();
      // A cell left on "automatic" takes the next active banner no other cell
      // uses, so two empty cells show the first two banners rather than the
      // same one twice.
      const used = new Set(cells.map((cell) => cell.bannerId).filter(Boolean));
      const auto = all.filter((b) => !used.has(b.id));
      return {
        cells: cells.map((cell) => ({
          id: cell.id,
          banner:
            (cell.bannerId
              ? all.find((b) => b.id === cell.bannerId)
              : undefined) ??
            auto.shift() ??
            null,
        })),
      };
    },
    component: LongBannerCells,
  },
  "tabbed-showcase": {
    meta: SECTION_TYPE_META_BY_TYPE["tabbed-showcase"],
    load: async (config) => {
      const c = config as {
        tabs?: ShowcaseTab[];
        columns?: number;
        height?: number;
        moreHref?: string;
        moreLabel?: string;
      };
      const version = await getRequestSiteVersion();
      return {
        tabs: await Promise.all(
          (c.tabs ?? []).map(async (tab) => ({
            ...tab,
            products: await getProductsBySlugs(tab.productSlugs, version),
          })),
        ),
        columns: c.columns ?? 4,
        height: c.height ?? 400,
        moreHref: c.moreHref,
        moreLabel: c.moreLabel,
      };
    },
    component: TabbedShowcase,
  },
  ambassador: {
    meta: SECTION_TYPE_META_BY_TYPE.ambassador,
    load: async (config) => {
      const c = config as {
        images?: AmbassadorImageConfig[];
        formTitle?: string;
        formIntro?: string;
      };
      const version = await getRequestSiteVersion();
      return {
        images: c.images ?? [],
        formTitle: c.formTitle ?? DEFAULT_AMBASSADOR_FORM_TITLE,
        formIntro: c.formIntro ?? DEFAULT_AMBASSADOR_FORM_INTRO,
        products: await getProductPickerOptions(version),
      };
    },
    component: AmbassadorSection,
  },
  reviews: {
    meta: SECTION_TYPE_META_BY_TYPE.reviews,
    load: async () => ({}),
    component: ReviewsSection,
  },
  instagram: {
    meta: SECTION_TYPE_META_BY_TYPE.instagram,
    load: async (config) => {
      const items = (config as { items?: InstagramItem[] })?.items ?? [];
      return {
        posts: items.map((item) => ({
          id: item.id,
          image: item.image,
          alt: item.alt ?? "Instagram post",
          href: item.href ?? "",
        })),
      };
    },
    component: InstagramSection,
  },
};
