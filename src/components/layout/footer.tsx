import Link from "next/link";
import { SITE } from "@/lib/constants";
import {
  FaFacebookF,
  FaInstagram,
  FaWhatsapp,
  FaYoutube,
} from "react-icons/fa";

const utilLinks = [
  { label: "Terms of use & Privacy Policy", href: "/policies/terms" },
  { label: "Cancellation & Refund Policy", href: "/policies/refund" },
  { label: "HELP", href: "/help" },
  { label: "COMMUNITY", href: "/community" },
];

const socialLinks = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/people/Our-Nara/61590428291987/",
    Icon: FaFacebookF,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/our__nara/",
    Icon: FaInstagram,
  },
  {
    label: "WhatsApp",
    href: "https://wa.me/918828338323",
    Icon: FaWhatsapp,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@our__nara",
    Icon: FaYoutube,
  },
];

/** Storefront footer: CS center + socials, utility links and company address. */
export function Footer() {
  return (
    <footer className="border-t border-zinc-100 bg-[#f9f9f9]">
      <div className="px-6 py-14 md:px-12">
        <div className="flex flex-col gap-10 md:flex-row md:gap-16">
          {/* CS CENTER */}
          <div className="md:w-[280px] md:shrink-0">
            <h3 className="text-[15px] font-medium tracking-tight text-black">
              CS CENTER
            </h3>
            <p className="mt-2 text-[26px] font-semibold leading-9 tracking-tight text-black">
              {SITE.supportPhone}
            </p>
            <p className="text-[13px] font-medium text-[#777]">
              Week 09:00 - 18:00
            </p>
            <p className="text-[13px] font-medium text-[#777]">
              [ Sat, Sun, Holiday OFF ]
            </p>
            <ul className="mt-5 flex gap-2.5">
              {socialLinks.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="block text-[22px] text-[#777] hover:opacity-50"
                  >
                    <Icon />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Utility links + company address */}
          <div className="md:max-w-[680px] md:flex-1">
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {utilLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[14px] font-medium tracking-tight text-black"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-4 text-[13px] leading-[24px]">
              <span className="text-[#777]">Company : {SITE.name} </span>
              <span className="text-[#777]">
                A Brand of : Seoulveda Trading LLP &amp; The First Team{" "}
              </span>
              <span className="text-[#777]">
                Phone : {SITE.supportPhone}
              </span>
              <br />
              <span className="text-[#777]">
                Address(India) : One World, S.V. Road, Near N L School, Malad
                West, Mumbai, Maharashtra 400064
              </span>
              <br />
              <span className="text-[#777]">
                Address(South Korea) : Room 1816, Building B, Incheon Techno
                Valley U1 Center, 94, Galsan-dong, Bupyeong-gu, Incheon,
                Republic of Korea
              </span>
              <br />
              <span className="text-[#777]">
                Personal information manager :{" "}
                <a
                  href={`mailto:${SITE.supportEmail}`}
                  className="hover:opacity-50"
                >
                  Seoulveda Trading LLP ({SITE.supportEmail})
                </a>
              </span>
              <br />
              <span className="text-[#777]">
                Copyright © {new Date().getFullYear()} {SITE.name}. All rights
                reserved.
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
