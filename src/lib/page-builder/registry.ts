import "server-only";
import type { ComponentType } from "react";
import { HeroCarousel } from "@/components/content/hero-carousel";
import { InstagramSection } from "@/components/content/instagram-section";
import { LongBanner } from "@/components/content/long-banner";
import { ReviewsSection } from "@/components/content/reviews-section";
import { ShortsCarousel } from "@/components/content/shorts-carousel";
import { TripleBanner } from "@/components/content/triple-banner";
import { ProductShowcase } from "@/components/theme/product-showcase";
import { getLongBanners } from "@/data/banners";
import type { ProductCard } from "@/data/products";
import {
  getAvailableNow,
  getFeaturedProducts,
  getPreOrderProducts,
  getProductsByBrandSlug,
  getProductsByCategorySlug,
  getProductsBySlugs,
} from "@/data/products";
import {
  SECTION_TYPE_META_BY_TYPE,
  type HeroSlide,
  type InstagramItem,
  type ProductSource,
  type SectionType,
  type SectionTypeMeta,
  type ShortItem,
} from "./types";

/**
 * Server-side section-type registry. Maps each section type to its renderer
 * component and a `load(config)` that fetches the props the renderer needs.
 * The storefront renderer iterates this registry to build a page.
 */

async function loadProducts(source: ProductSource): Promise<ProductCard[]> {
  switch (source.kind) {
    case "featured":
      return getFeaturedProducts(source.take);
    case "pre-order":
      return getPreOrderProducts(source.take);
    case "available-now":
      return getAvailableNow(source.take);
    case "brand":
      return getProductsByBrandSlug(source.slug, source.take);
    case "category":
      return getProductsByCategorySlug(source.slug, source.take);
    case "slugs":
      return getProductsBySlugs(source.slugs);
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
        moreHref?: string;
        moreLabel?: string;
      };
      return {
        sub: c.sub,
        title: c.title,
        products: await loadProducts(c.source),
        layout: c.layout ?? "grid",
        columns: c.columns ?? 5,
        moreHref: c.moreHref,
        moreLabel: c.moreLabel,
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
      return {
        boxes: await Promise.all(
          (c.boxes ?? []).map(async (box) => ({
            ...box,
            products: await getProductsBySlugs(box.productSlugs),
          })),
        ),
      };
    },
    component: TripleBanner,
  },
  "long-banner": {
    meta: SECTION_TYPE_META_BY_TYPE["long-banner"],
    load: async () => ({ banners: await getLongBanners() }),
    component: LongBanner,
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
