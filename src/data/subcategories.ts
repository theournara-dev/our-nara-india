/**
 * Subcategory data for the category pages. Mirrors the header submenu
 * (e.g. Skin Care → Masks & Patches / Facial Care / Cleansing / Sun Care / Set)
 * and maps each product to a subcategory so the category page can filter.
 * Temporary static data — will be replaced by the backend catalog later.
 */

export interface Subcategory {
  slug: string;
  name: string;
}

/** Subcategories available under each root category. */
export const subcategoriesByCategory: Record<string, Subcategory[]> = {
  "skin-care": [
    { slug: "masks-patches", name: "Masks & Patches" },
    { slug: "facial-care", name: "Facial Care" },
    { slug: "cleansing", name: "Cleansing" },
    { slug: "sun-care", name: "Sun Care" },
    { slug: "set", name: "Set" },
  ],
  makeup: [
    { slug: "base-makeup", name: "Base Makeup" },
    { slug: "eye-makeup", name: "Eye Makeup" },
    { slug: "lip-makeup", name: "Lip Makeup" },
  ],
  "hair-care": [{ slug: "hair-care", name: "Hair Care" }],
  "pre-order": [
    { slug: "masks-patches", name: "Masks & Patches" },
    { slug: "facial-care", name: "Facial Care" },
    { slug: "cleansing", name: "Cleansing" },
    { slug: "sun-care", name: "Sun Care" },
    { slug: "hair-care", name: "Hair Care" },
    { slug: "base-makeup", name: "Base Makeup" },
    { slug: "eye-makeup", name: "Eye Makeup" },
    { slug: "lip-makeup", name: "Lip Makeup" },
  ],
};

/** Product slug → subcategory slug. */
export const subcategoryByProduct: Record<string, string> = {
  // Skin Care
  "brightening-vitamin-serum": "facial-care",
  "return-collagen-cream-50g": "facial-care",
  "prestige73-teatree-mask-70g": "masks-patches",
  "prestige-collagen-eye-cream-25ml": "facial-care",
  "no-pore-cleansing-oil": "cleansing",
  "cica-panthenol-soothing-cream": "facial-care",
  "vegan-sun-cream": "sun-care",
  "soft-reset-green-cleansing-balm": "cleansing",
  "hydrating-hyaluronic-mist": "facial-care",
  "green-tangerine-vita-c-mist": "facial-care",
  // Makeup
  "blurring-slip-fit-lipcheek-choose-1-of-6": "lip-makeup",
  "first-stain-glow-tint-choose-1-of-10": "lip-makeup",
  "gleaming-skin-cushion-v2": "base-makeup",
  "love-core-tatto-water-tint-choose-1-of-20": "lip-makeup",
  "glow-dewy-tint-choose-1-of-10": "lip-makeup",
  // Pre-order
  "skin-booster-collagen-mask-50g": "masks-patches",
  "peptide-volume-lifting-pro-essence-30ml": "facial-care",
  "peptide-volume-lifting-pro-essence-100ml": "facial-care",
  "centella-dark-spot-solution-ampoule-pro": "facial-care",
  "peptide-volume-neck-cream": "facial-care",
  "centella-moist-soothing-gel-cream-ex": "facial-care",
  "timemelody-gold-collagen-ampoule": "facial-care",
  "grasen-hyal-pdrn-lift-shot-ampoule": "facial-care",
  "calming-cica-hydrogel-mask": "masks-patches",
  "radiance-collagen-hydrogel-mask": "masks-patches",
  "cream-hydrating-ingredients": "facial-care",
  "toner-soothing-treatment": "facial-care",
  "sunscreen-protection-factor": "sun-care",
  "aqua-protein-first-ampoule": "facial-care",
  "aqua-protein-cream": "facial-care",
  "stem-cell-peptide-retinol": "facial-care",
};

/** Subcategories for a root category slug (empty when none). */
export function getSubcategories(categorySlug: string): Subcategory[] {
  return subcategoriesByCategory[categorySlug] ?? [];
}

/** Subcategory slug for a product, or null when unassigned. */
export function getSubcategoryForProduct(productSlug: string): string | null {
  return subcategoryByProduct[productSlug] ?? null;
}

/** Resolve a subcategory slug from a root category slug + display name. */
export function getSubcategorySlugByName(
  categorySlug: string,
  name: string,
): string | null {
  const found = (subcategoriesByCategory[categorySlug] ?? []).find(
    (s) => s.name.toLowerCase() === name.trim().toLowerCase(),
  );
  return found ? found.slug : null;
}
