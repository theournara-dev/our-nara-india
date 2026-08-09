/**
 * Home page Instagram strip: an auto-scrolling marquee of posts linking to the
 * store's Instagram. Reproduces the original theme's `insta` section.
 *
 * Static, DB-free data layer — swap for Prisma later without touching the UI.
 */

export interface InstagramPost {
  id: string;
  image: string;
  alt: string;
  /** Link to the Instagram post/reel. */
  href: string;
}

export const instagramPosts: InstagramPost[] = [
  {
    id: "i1",
    image: "/upload/goodymall1/insta/insta_01.jpg",
    alt: "Instagram post",
    href: "https://www.instagram.com/reel/DZalyfdNbtv/",
  },
  {
    id: "i2",
    image: "/upload/goodymall1/insta/insta_02.jpg",
    alt: "Instagram post",
    href: "https://www.instagram.com/reel/DZan3Mftg9P/",
  },
  {
    id: "i3",
    image: "/upload/goodymall1/insta/insta_03.jpg",
    alt: "Instagram post",
    href: "https://www.instagram.com/reel/DZeaSpgNAKc/",
  },
  {
    id: "i4",
    image: "/upload/goodymall1/insta/insta_04.jpg",
    alt: "Instagram post",
    href: "https://www.instagram.com/reel/DZr8c7CtJmL/",
  },
  {
    id: "i5",
    image: "/upload/goodymall1/insta/insta_05.jpg",
    alt: "Instagram post",
    href: "https://www.instagram.com/reel/DaNVt75N3p5/",
  },
  {
    id: "i6",
    image: "/upload/goodymall1/insta/insta_06.jpg",
    alt: "Instagram post",
    href: "https://www.instagram.com/reel/DaP4sqbNsrw/",
  },
];

/**
 * Default Instagram items for a new Instagram section, projected from the
 * original static posts into the page-builder config shape.
 */
export const defaultInstagramItems = instagramPosts.map((p) => ({
  id: p.id,
  image: p.image,
  alt: p.alt,
  href: p.href,
}));
