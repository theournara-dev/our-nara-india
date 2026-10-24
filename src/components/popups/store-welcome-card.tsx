"use client";

import Image from "next/image";
import { Check, PackageOpen, Plane, Star } from "lucide-react";
import { FaTruckFast } from "react-icons/fa6";
import type { ComponentType } from "react";
import type { SiteVersion } from "@/lib/site-version";

type Benefit = {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
};

/**
 * The single-store welcome card: one design per store, sharing the same
 * layout. Both the top check and the CTA dismiss the popup; clicking the
 * overlay is handled by PopupSurface.
 */
export function StoreWelcomeCard({
  store,
  onClose,
}: {
  store: SiteVersion;
  onClose: () => void;
}) {
  const global = store === "global";

  const theme = global
    ? {
        shell: "bg-gradient-to-br from-[#7c3aed] via-[#a855f7] to-[#ec4899] p-[1.5px]",
        card: "bg-white",
        pill: "bg-[#f3ebff] text-[#7c3aed]",
        pillText: "Korea → India",
        name: "Shop K-Drop",
        nameClass:
          "bg-gradient-to-r from-[#7c3aed] via-[#a855f7] to-[#ec4899] bg-clip-text text-transparent",
        subtitle: "Direct shipping from Korea",
        subtitleClass: "text-zinc-500",
        flag: "/flags/kr.svg",
        flagClass: "shadow-[0_0_0_1px_rgba(0,0,0,0.12)]",
        benefitText: "text-zinc-600",
        iconClass: "text-[#7c3aed]",
        divider: "divide-[#ede3fb]",
        check:
          "bg-gradient-to-br from-[#7c3aed] to-[#ec4899] text-white shadow-[0_2px_8px_rgba(124,58,237,0.35)]",
        cta:
          "bg-gradient-to-r from-[#7c3aed] via-[#a855f7] to-[#ec4899] text-white shadow-[0_4px_14px_rgba(168,85,247,0.28)]",
        ctaLabel: "OUR:NARA KOREA",
        benefits: [
          { icon: Plane, label: "Korea direct shipping" },
          { icon: Star, label: "More Korean products" },
        ] satisfies Benefit[],
      }
    : {
        shell: "border border-[#dbcdb4] bg-[#fbf7ef]",
        card: "bg-[#fbf7ef]",
        pill: "bg-[#efe4d0] text-[#6b5a45]",
        pillText: "Domestic Delivery",
        name: "Shop India",
        nameClass: "text-[#1f2b45]",
        subtitle: "Local delivery within India",
        subtitleClass: "text-[#6b7280]",
        flag: "/flags/in.svg",
        flagClass: "shadow-[0_0_0_1px_rgba(0,0,0,0.12)]",
        benefitText: "text-[#3f4a5c]",
        iconClass: "text-[#1f2b45]",
        divider: "divide-[#dbcdb4]",
        check:
          "bg-white text-[#1f2b45] shadow-[0_2px_8px_rgba(31,43,69,0.16)]",
        cta: "bg-[#8b8175] text-white shadow-[0_4px_14px_rgba(80,70,58,0.18)]",
        ctaLabel: "OUR:NARA INDIA",
        benefits: [
          { icon: FaTruckFast, label: "Fast domestic shipping" },
          { icon: PackageOpen, label: "Easy local returns" },
        ] satisfies Benefit[],
      };

  return (
    <div className={`h-full ${theme.shell}`}>
      <div className={`flex h-full flex-col p-5 sm:p-6 ${theme.card}`}>
        <div className="relative flex items-center justify-center">
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-semibold tracking-wide ${theme.pill}`}
          >
            {theme.pillText}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close popup"
            className={`absolute right-0 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c3aed] ${theme.check}`}
          >
            <Check size={16} strokeWidth={3} aria-hidden />
          </button>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Image
            src={theme.flag}
            alt=""
            width={44}
            height={44}
            unoptimized
            className={`h-11 w-11 shrink-0 rounded-xl object-cover ${theme.flagClass}`}
          />
          <div className="min-w-0">
            <h2 className={`text-2xl font-bold leading-tight ${theme.nameClass}`}>
              {theme.name}
            </h2>
            <p className={`mt-0.5 text-sm ${theme.subtitleClass}`}>
              {theme.subtitle}
            </p>
          </div>
        </div>

        <div
          className={`mt-5 grid grid-cols-2 divide-x text-[11px] font-medium sm:text-xs ${theme.divider}`}
        >
          {theme.benefits.map(({ icon: Icon, label }, index) => (
            <div
              key={label}
              className={`flex items-center gap-2 ${theme.benefitText} ${
                index === 0 ? "pr-3" : "pl-3"
              }`}
            >
              <Icon className={`h-5 w-5 shrink-0 ${theme.iconClass}`} aria-hidden />
              <span>{label}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className={`mt-5 h-12 w-full rounded-xl text-[10px] font-bold uppercase tracking-[0.16em] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7c3aed] sm:text-[11px] ${theme.cta}`}
        >
          {theme.ctaLabel}
        </button>
      </div>
    </div>
  );
}
