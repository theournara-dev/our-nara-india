import Link from "next/link";
import type { BrandSummary } from "@/data/brands";
import { brandIndexAnchor, type BrandIndexGroup } from "@/lib/brand-index";

// The original sets a 100px scroll-margin-top on each brand section; keeping it
// makes jumps from the letter row land at the same offset.
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
          className="mb-[72px] scroll-mt-[100px]"
        >
          <h2 className="mb-[28px] text-[24px] leading-[1] font-bold text-[#111]">
            {group.key}
          </h2>
          <ul className="grid grid-cols-3 gap-x-[30px] gap-y-[22px] md:grid-cols-4 md:gap-x-[70px]">
            {group.brands.map((brand) => (
              <li key={brand.slug}>
                <Link
                  href={`/brand/${brand.slug}`}
                  className="block font-normal break-words text-[13px] leading-[1.5] text-[#222] no-underline transition-[color] duration-200 [transition-timing-function:ease] hover:text-[#6f2dbd] md:text-[15px]"
                >
                  {brand.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
