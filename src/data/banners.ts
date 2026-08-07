/**
 * Home page long banner content. Reproduces the original theme's
 * `longBanner01` section: a full-width, rounded banner carousel. Each banner
 * has a desktop and a mobile image (the theme swaps them responsively).
 *
 * Static, DB-free data layer — swap for Prisma later without touching the UI.
 */

export interface LongBanner {
  id: string;
  /** Desktop image (wide). */
  image: string;
  /** Mobile image (taller aspect), swapped in on small screens. */
  mobileImage: string;
  alt: string;
  href?: string;
}

export const longBanners: LongBanner[] = [
  {
    id: "lb1",
    image: "/upload/goodymall1/en/main/long__banner01.jpg",
    mobileImage: "/upload/goodymall1/en/main/m_long__banner01.jpg",
    alt: "OUR:NARA banner",
    href: "/",
  },
];
