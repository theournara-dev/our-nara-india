import { headers } from "next/headers";
import { FloatingButtons } from "@/components/layout/floating-buttons";
import { Reveal } from "@/components/ui/reveal";
import { StaticHome } from "@/components/home/static-home";
import { getPage, isInSchedule } from "@/lib/page-builder/data";
import { SECTION_TYPES } from "@/lib/page-builder/registry";
import type { SectionType } from "@/lib/page-builder/types";
import { getSiteUrl, resolveRequestSiteVersion } from "@/lib/site-version";

// The page structure is DB-driven, so it must render per request.
export const dynamic = "force-dynamic";

/**
 * Home page — dynamically structured by the page builder.
 *
 * Reads the `home` Page row and renders its active, in-schedule sections in
 * order, resolving each through the section-type registry. Falls back to the
 * original hardcoded homepage (`StaticHome`) when no `home` page exists yet,
 * so the storefront never regresses before seeding.
 */
export default async function HomePage() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const siteUrl = getSiteUrl(resolveRequestSiteVersion(host));
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "OUR:NARA",
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    sameAs: [
      "https://www.instagram.com/our__nara/",
      "https://www.facebook.com/people/Our-Nara/61590428291987/",
    ],
  };

  const page = await getPage("home");

  const loaded = page?.isActive
    ? await Promise.all(
        page.sections
          .filter((s) => s.isActive && isInSchedule(s))
          .map(async (s) => {
            const type = SECTION_TYPES[s.type as SectionType];
            if (!type) return null;
            const props = await type.load(s.config);
            return { key: s.id, Component: type.component, props };
          }),
      )
    : [];
  const sections = loaded.filter(
    (s): s is NonNullable<typeof s> => s !== null,
  );

  const homeContent =
    !page || !page.isActive ? (
      <StaticHome />
    ) : (
      <div>
        {sections.map((s) => (
          <Reveal key={s.key}>
            <s.Component {...s.props} />
          </Reveal>
        ))}
        {/* Floating actions (home only): recent views + scroll to top */}
        <FloatingButtons />
      </div>
    );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema).replace(/</g, "\\u003c"),
        }}
      />
      {homeContent}
    </>
  );
}
