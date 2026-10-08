import {
  BRAND_INDEX_KEYS,
  brandIndexAnchor,
  type BrandIndexKey,
} from "@/lib/brand-index";

// Measured on the original brand page: 26px circle + 1px border on mobile,
// 32px + 1px border from 768px up.
const CIRCLE =
  "box-content flex size-[26px] shrink-0 items-center justify-center rounded-[50%] border border-[#6f2dbd] bg-[#6f2dbd] text-[11px] leading-none font-bold text-white no-underline md:size-[32px] md:text-[12px]";

const LINK =
  "transition-[background-color,color,transform,box-shadow] duration-200 [transition-timing-function:ease] hover:bg-white hover:text-[#6f2dbd] hover:[transform:translateY(-2px)] hover:shadow-[0_4px_12px_rgba(111,45,189,0.2)] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#6f2dbd] focus-visible:outline-offset-[3px]";

// `relative` keeps the screen-reader text inside the scrolling row; without it
// the text is positioned against the page and widens the document.
const DISABLED = `${CIRCLE} relative cursor-default opacity-40`;

// Mobile: a full-bleed strip that scrolls sideways with its scrollbar hidden.
// Desktop: one line spread across the full brand width.
const ROW =
  "-mx-5 mb-[65px] flex w-[calc(100%+40px)] items-center justify-start overflow-x-auto overflow-y-hidden border-b border-[#eee] py-[14px] max-md:gap-[14px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:w-full md:justify-between md:px-[10px] md:py-4";

function spokenName(key: BrandIndexKey) {
  return key === "#" ? "a number or symbol" : key;
}

export function BrandLetterNav({
  activeKeys,
}: {
  activeKeys: ReadonlySet<BrandIndexKey>;
}) {
  return (
    <nav aria-label="Brands by letter">
      <div className={ROW}>
        {BRAND_INDEX_KEYS.map((key) =>
          activeKeys.has(key) ? (
            <a
              key={key}
              href={`#${brandIndexAnchor(key)}`}
              aria-label={`Brands starting with ${spokenName(key)}`}
              className={`${CIRCLE} ${LINK}`}
            >
              {key}
            </a>
          ) : (
            <span key={key} aria-disabled="true" className={DISABLED}>
              <span aria-hidden="true">{key}</span>
              <span className="sr-only">
                No brands starting with {spokenName(key)}
              </span>
            </span>
          ),
        )}
      </div>
    </nav>
  );
}
