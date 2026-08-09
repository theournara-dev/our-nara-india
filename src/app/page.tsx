import { FloatingButtons } from "@/components/layout/floating-buttons";
import { Reveal } from "@/components/ui/reveal";
import { StaticHome } from "@/components/home/static-home";
import { getPage, isInSchedule } from "@/lib/page-builder/data";
import { SECTION_TYPES } from "@/lib/page-builder/registry";
import type { SectionType } from "@/lib/page-builder/types";

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
  const page = await getPage("home");
  if (!page || !page.isActive) return <StaticHome />;

  const loaded = await Promise.all(
    page.sections
      .filter((s) => s.isActive && isInSchedule(s))
      .map(async (s) => {
        const type = SECTION_TYPES[s.type as SectionType];
        if (!type) return null;
        const props = await type.load(s.config);
        return { key: s.id, Component: type.component, props };
      }),
  );
  const sections = loaded.filter(
    (s): s is NonNullable<typeof s> => s !== null,
  );

  return (
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
}
