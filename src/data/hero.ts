/**
 * Default hero carousel slides, mirroring the original theme's `mainBanner`
 * section. Used as the initial content for a new Hero section and as the
 * fallback when a hero section has no slides yet, so the homepage never
 * regresses.
 */
export interface HeroSlideData {
  id: string;
  image: string;
  title?: string;
  description?: string;
  brand?: string;
  href?: string;
  preorder: boolean;
}

export const defaultHeroSlides: HeroSlideData[] = [
  {
    id: "h1",
    image: "/upload/goodymall1/en/main/main_box_img01_2.jpg",
    title: "Sunscreen",
    description:
      "Strong UV protection without the oily feel\nmade gentle for sensitive, breakout-prone skin",
    brand: "LA THEORIE",
    href: "/brand/la-theorie",
    preorder: true,
  },
  {
    id: "h2",
    image: "/upload/goodymall1/en/main/main_box_img02_1.jpg",
    title: "Cica Panthenol Soothing Cream",
    description:
      "Calms sensitive skin with cica and panthenol\nwhile locking in deep moisture for lasting comfort",
    brand: "HEARIM",
    href: "/brand/hearim",
    preorder: true,
  },
  {
    id: "h3",
    image: "/upload/goodymall1/en/main/main_box_img03_1.jpg",
    title: "Peptide Volume Master Essence",
    description:
      "Multi-peptide care helps revive tired skin\nfor a firmer, healthier, and more vibrant look",
    brand: "DR.PEPTI",
    href: "/brand/dr-pepti",
    preorder: true,
  },
  {
    id: "h4",
    image: "/upload/goodymall1/en/main/main_box_img04_1.jpg",
    title: "Stem Cell Peptide Retinol",
    description:
      "Overnight repair with stem cells, peptide and retinol\nfor firmer, smoother, barrier-strengthened skin",
    brand: "FABYOU",
    href: "/brand/fabyou",
    preorder: true,
  },
  {
    id: "h5",
    image: "/upload/goodymall1/en/main/main_box_img05_1.jpg",
    title: "Nopore Cleansing Oil",
    description:
      "Melts away makeup, blackheads, and excess sebum\nwhile leaving skin clean and hydrated.",
    brand: "NOWATER",
    href: "/brand/nowater",
    preorder: false,
  },
  {
    id: "h6",
    image: "/upload/goodymall1/en/main/main_box_img06_1.jpg",
    title: "Heavy Blurring Slip Fit Lip Cheek",
    description:
      "Airy texture melts into every curve\nfor a naturally toned, soft-matte finish.",
    brand: "HEVVY MAKEUP",
    href: "/brand/hevvy-makeup",
    preorder: true,
  },
  {
    id: "h7",
    image: "/upload/goodymall1/en/main/main_box_img07.jpg",
    href: "/",
    preorder: false,
  },
];
