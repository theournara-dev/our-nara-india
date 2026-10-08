import type { Metadata } from "next";
import { BrandDirectory } from "@/components/brands/brand-directory";
import { BrandLetterNav } from "@/components/brands/brand-letter-nav";
import { getBrands } from "@/data/brands";
import { groupBrandsByLetter } from "@/lib/brand-index";

export const metadata: Metadata = { title: "Shop by Brand" };

// Brands are managed in the admin, so this list must reflect the database on
// every request instead of being cached from the first render.
export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const groups = groupBrandsByLetter(await getBrands());
  const activeKeys = new Set(groups.map((group) => group.key));

  return (
    <div className="mx-auto w-[98%]">
      <div className="mx-auto box-content max-w-[1280px] px-5 pt-[41px] pb-[120px] text-[#111]">
        <div className="mb-[15px] text-center md:mb-[50px]">
          {/* The mobile title sits 23px higher than its box, as on the original. */}
          <h1 className="mt-[-23px] text-[1.3rem] leading-[normal] font-bold text-[#222] md:mt-0 md:text-[2rem]">
            BRAND
          </h1>
        </div>
        <BrandLetterNav activeKeys={activeKeys} />
        <BrandDirectory groups={groups} />
      </div>
    </div>
  );
}
