import Image from "next/image";
import { instagramPosts } from "@/data/instagram";

/**
 * Home Instagram strip, reproducing the original `insta` section: an
 * auto-scrolling marquee of square Instagram images (rounded) under the
 * #our__nara title. Driven by a CSS animation, so clicking a slide link can
 * never pause it. Pauses briefly while hovered for easy clicking.
 */
export function InstagramSection() {
  if (instagramPosts.length === 0) return null;

  // Double the list so the marquee can loop seamlessly by translating -50%.
  const items = [...instagramPosts, ...instagramPosts];

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
            {items.map((post, i) => (
              <a
                key={`${post.id}-${i}`}
                href={post.href}
                target="_blank"
                rel="noopener noreferrer"
                className="insta-item"
              >
                <Image
                  src={post.image}
                  alt={post.alt}
                  width={400}
                  height={400}
                  unoptimized
                />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
