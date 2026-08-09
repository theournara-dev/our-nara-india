"use client";

// Section configs are dynamic per type, so the config payload is intentionally
// loosely typed in the form layer.
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ComponentType } from "react";
import {
  SECTION_TYPE_META_BY_TYPE,
  type SectionType,
  type SectionTypeMeta,
} from "@/lib/page-builder/types";
import type { SectionFormOptions } from "./fields";
import {
  HeroForm,
  InstagramForm,
  LongBannerForm,
  ProductCarouselForm,
  ProductGridForm,
  ReviewsForm,
  ShortsForm,
  TripleBannerForm,
} from "./forms";

/**
 * Client-side section-type registry: maps each type to its admin form. The
 * builder dialog renders the form for the section being edited.
 */

export interface AdminSectionType {
  meta: SectionTypeMeta;
  adminForm: ComponentType<{
    config: any;
    onChange: (config: any) => void;
    options: SectionFormOptions;
  }>;
}

export const ADMIN_SECTION_TYPES: Record<SectionType, AdminSectionType> = {
  hero: { meta: SECTION_TYPE_META_BY_TYPE.hero, adminForm: HeroForm },
  "product-carousel": {
    meta: SECTION_TYPE_META_BY_TYPE["product-carousel"],
    adminForm: ProductCarouselForm,
  },
  shorts: { meta: SECTION_TYPE_META_BY_TYPE.shorts, adminForm: ShortsForm },
  "triple-banner": {
    meta: SECTION_TYPE_META_BY_TYPE["triple-banner"],
    adminForm: TripleBannerForm,
  },
  "product-grid": {
    meta: SECTION_TYPE_META_BY_TYPE["product-grid"],
    adminForm: ProductGridForm,
  },
  "long-banner": {
    meta: SECTION_TYPE_META_BY_TYPE["long-banner"],
    adminForm: LongBannerForm,
  },
  reviews: { meta: SECTION_TYPE_META_BY_TYPE.reviews, adminForm: ReviewsForm },
  instagram: {
    meta: SECTION_TYPE_META_BY_TYPE.instagram,
    adminForm: InstagramForm,
  },
};
