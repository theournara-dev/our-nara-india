"use client";

import { useState } from "react";
import { StoreInfo } from "@/components/stores/store-info";
import { StoreMap } from "@/components/stores/store-map";
import { storeHoursLines } from "@/lib/store-hours";
import { resolveStoreMapQuery } from "@/lib/store-map";
import type { StoreView } from "@/data/stores";

/**
 * The stores list. One store renders as the familiar map + card pair; several
 * render under a row of store-name pills so a shopper can switch between them
 * without loading a map per store.
 */
export function StoreDirectory({ stores }: { stores: StoreView[] }) {
  const [active, setActive] = useState(0);

  if (stores.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[#e5e5e5] py-16 text-center text-[15px] text-[#999]">
        Store details are coming soon.
      </p>
    );
  }

  const index = Math.min(active, stores.length - 1);
  const store = stores[index];

  return (
    <div>
      {stores.length > 1 && (
        <div className="mb-[22px] flex flex-wrap justify-center gap-2">
          {stores.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={i === index}
              className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm transition-colors ${
                i === index
                  ? "border-point-500 bg-point-500 text-white"
                  : "border-[#e9e9e9] text-[#555] hover:border-point-500 hover:text-point-500"
              }`}
            >
              {s.name || `Store ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      <section className="grid grid-cols-[minmax(0,1fr)] gap-[22px] min-[1025px]:grid-cols-[minmax(0,2fr)_410px] min-[1025px]:gap-[36px]">
        <StoreMap
          name={store.name}
          query={resolveStoreMapQuery(store.mapQuery, store.address)}
        />
        <StoreInfo
          name={store.name}
          address={store.address}
          phone={store.phone}
          email={store.email}
          hours={storeHoursLines(store.hours)}
        />
      </section>
    </div>
  );
}
