import Image from "next/image";
import { instagramPosts } from "@/data/instagram";
import type { InstagramPost } from "@/data/instagram";

/**
 * Home Instagram strip, reproducing the original `insta` section: an
 * auto-scrolling marquee of square Instagram images (rounded) under the
 * #our__nara title. Driven by a CSS animation, so clicking a slide link can
 * never pause it. Pauses briefly while hovered for easy clicking.
 */
export function InstagramSection({ posts = [] }: { posts?: InstagramPost[] }) {
  // Fall back to the original posts when the section has none configured.
  const items = posts.length > 0 ? posts : instagramPosts;
  if (items.length === 0) return null;

  // Double the list so the marquee can loop seamlessly by translating -50%.
  const doubled = [...items, ...items];

  return (
    <section className="insta">
      <div className="insta-inner">
        <div className="sub-title">
          <h2>
            <span className="sub">
              <a
                href="https://www.instagram.com/our__nara/"
                target="_blank"
                rel="noopener noreferrer"
              >
                INSTAGRAM #our__nara
              </a>
            </span>
            Influencer story proven by 10,000+ reviews
          </h2>
        </div>

        <div className="insta-marquee">
          <div className="insta-marquee-track">
            {doubled.map((post, i) => (
              <InstagramItem key={`${post.id}-${i}`} post={post} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** A single marquee item: image, optionally wrapped in a link to the post. */
function InstagramItem({ post }: { post: InstagramPost }) {
  const img = (
    <Image
      src={post.image}
      alt={post.alt}
      width={400}
      height={400}
      unoptimized
    />
  );
  return post.href ? (
    <a
      href={post.href}
      target="_blank"
      rel="noopener noreferrer"
      className="insta-item"
    >
      {img}
    </a>
  ) : (
    <div className="insta-item">{img}</div>
  );
}
