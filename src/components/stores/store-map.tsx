import { ExternalLink } from "lucide-react";
import { storeMapEmbedUrl, storeMapOpenUrl } from "@/lib/store-map";

/**
 * The store's Google map, with the original's rounded frame. On phones Google's
 * embed draws its own "Open in Maps" pill at the top-left; the overlay covers it
 * so the link opens this store's location. From 768px the embed's own place card
 * (with its own button) is shown, as on the original.
 */
export function StoreMap({ query, name }: { query: string; name: string }) {
  return (
    <div className="relative min-h-[320px] overflow-hidden rounded-[14px] bg-[#f5f5f5] md:rounded-[18px] md:max-[1025px]:min-h-[430px] min-[1025px]:min-h-[520px]">
      <iframe
        src={storeMapEmbedUrl(query)}
        title={`${name} location on Google Maps`}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        className="absolute inset-0 h-full w-full border-0"
      />
      <a
        href={storeMapOpenUrl(query)}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-[8px] left-[8px] z-10 inline-flex h-[32px] min-w-[126px] items-center justify-center gap-[6px] rounded-full bg-white px-[12px] text-[12px] leading-[normal] font-medium text-[#1a73e8] shadow-[0_1px_4px_rgba(0,0,0,0.3)] md:hidden"
      >
        <ExternalLink size={12} aria-hidden="true" />
        Open in Maps
      </a>
    </div>
  );
}
