import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { stores } from "@/data/content";

export const metadata: Metadata = { title: "Stores" };

/** Stores page matching the original: a STORES heading and a store info
 *  table (Address / Phone / Email / Business Hours). */
export default function StoresPage() {
  const store = stores[0];

  return (
    <div>
      <Container className="py-12">
        <h1 className="mb-8 text-center font-display text-3xl font-semibold text-ink">
          STORES
        </h1>

        {store && (
          <div className="mx-auto max-w-xl border border-[#e9e9e9] bg-white">
            <p className="border-b border-[#e9e9e9] px-6 py-3 font-display text-lg font-semibold text-ink">
              {store.name}
            </p>
            <table className="w-full text-sm">
              <tbody>
                {(
                  [
                    ["Address", store.address],
                    ["Phone", store.phone],
                    ["Email", store.email],
                    ["Business Hours", store.hours],
                  ] as const
                ).map(([label, value]) => (
                  <tr
                    key={label}
                    className="border-b border-[#eee] last:border-b-0"
                  >
                    <th className="w-32 px-6 py-3 text-left align-top font-semibold text-[#222]">
                      {label}
                    </th>
                    <td className="px-6 py-3 align-top text-[#555]">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Container>
    </div>
  );
}
