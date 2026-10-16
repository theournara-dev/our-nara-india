import Image from "next/image";

/**
 * A brand page's banner (client slide 12: "Add a layout that supports banner
 * images on each brand page"). The artwork is set per brand in the admin
 * (Brands → Edit → Page banner) and rendered full width under the breadcrumb,
 * cropped to a wide strip so any upload keeps the page's rhythm.
 *
 * Brands without artwork render nothing, so a page never shows an empty frame.
 * The banner belongs to the page it sits on, so it carries no link of its own —
 * only alt text.
 */
export function BrandBanner({
  image,
  name,
}: {
  image: string | null | undefined;
  name: string;
}) {
  if (!image) return null;

  return (
    <div className="mb-6 aspect-[1560/440] w-full overflow-hidden rounded-2xl bg-[#f6f6f6] max-md:aspect-[16/9]">
      <Image
        src={image}
        alt={`${name} banner`}
        width={1560}
        height={440}
        unoptimized
        priority
        sizes="(max-width: 1560px) 100vw, 1560px"
        className="h-full w-full object-cover"
      />
    </div>
  );
}
