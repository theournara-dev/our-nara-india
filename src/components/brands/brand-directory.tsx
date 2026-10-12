import Image from "next/image";
import Link from "next/link";
import type { BrandSummary } from "@/data/brands";
import { brandIndexAnchor, type BrandIndexGroup } from "@/lib/brand-index";

// The original sets a 100px scroll-margin-top on each brand section; keeping it
// makes jumps from the letter index land at the same offset.
export function BrandDirectory({
  groups,
}: {
  groups: BrandIndexGroup<BrandSummary>[];
}) {
  return (
    <div>
      {groups.map((group) => (
        <section
          key={group.key}
          id={brandIndexAnchor(group.key)}
          className="mb-[60px] scroll-mt-[100px]"
        >
          <h2 className="mb-[24px] text-[24px] leading-[1] font-bold text-[#111]">
            {group.key}
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {group.brands.map((brand) => (
              <li key={brand.slug}>
                {/* The client's slide 8: a brand image; brands without one show
                    their name instead. */}
                <Link
                  href={`/brand/${brand.slug}`}
                  className="group flex min-h-[150px] flex-col items-center justify-center gap-3 rounded-2xl border border-[#eee] bg-white p-5 text-center transition-[border-color,box-shadow] duration-200 hover:border-point-200 hover:shadow-[0_8px_24px_rgba(111,45,189,0.08)]"
                >
                  {brand.logoUrl && (
                    <Image
                      src={brand.logoUrl}
                      alt=""
                      width={180}
                      height={90}
                      unoptimized
                      className="max-h-[70px] w-auto object-contain"
                    />
                  )}
                  <span
                    className={`break-words font-medium text-[#222] transition-colors group-hover:text-point-500 ${
                      brand.logoUrl ? "text-[13px]" : "text-[15px]"
                    }`}
                  >
                    {brand.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
