import { storeDetailValue } from "@/lib/store-map";

/**
 * The store details card: under the map on phones, beside it on desktop. Labels,
 * values, rules and spacing follow the original's store card.
 */
export function StoreInfo({
  name,
  address,
  phone,
  email,
  hours,
}: {
  name: string;
  address: string;
  phone: string;
  email: string;
  /** Compressed opening-hours lines, e.g. ["Mon–Fri 09:00–18:00"]. */
  hours: string[];
}) {
  const rows = [
    ["Address", address],
    ["Phone", phone],
    ["Email", email],
    ["Business Hours", hours.join("\n")],
  ] as const;

  return (
    <div className="rounded-[14px] bg-[#e9d5ff] px-[24px] py-[34px] md:rounded-[18px] md:max-[1025px]:px-[34px] md:max-[1025px]:py-[42px] min-[1025px]:px-[44px] min-[1025px]:py-[50px]">
      <h2 className="mb-[28px] text-[28px] leading-[normal] font-extrabold text-[#222] md:mb-[36px] md:text-[34px]">
        {name}
      </h2>
      <dl className="border-t border-[#d8dfd5]">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="border-b border-[#d8dfd5] py-[22px] md:py-[26px]"
          >
            <dt className="mb-[12px] text-[15px] leading-[normal] font-bold text-[#6f2dbd]">
              {label}
            </dt>
            <dd className="text-[15px] leading-[1.7] break-words whitespace-pre-line text-[#333] md:text-[16px]">
              {storeDetailValue(value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
