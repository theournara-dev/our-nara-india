import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { getPage } from "@/lib/page-builder/data";
import { SECTION_TYPES } from "@/lib/page-builder/registry";
import type { SectionType } from "@/lib/page-builder/types";

export const metadata: Metadata = { title: "Ambassador" };

// The page's section (images, links, form copy) is admin-managed, so it must
// reflect the database on every request instead of caching the first render.
export const dynamic = "force-dynamic";

/**
 * /ambassador: the title, then the page-builder sections — the ambassador
 * stage (admin images + application form) is edited under Pages like every
 * other page.
 */
export default async function AmbassadorPage() {
  const page = await getPage("ambassador");

  const loaded = page?.isActive
    ? await Promise.all(
        page.sections
          .filter((s) => s.isActive)
          .map(async (s) => {
            const type = SECTION_TYPES[s.type as SectionType];
            if (!type) return null;
            return {
              key: s.id,
              Component: type.component,
              props: await type.load(s.config),
            };
          }),
      )
    : [];
  const sections = loaded.filter((s): s is NonNullable<typeof s> => s !== null);

  return (
    <div>
      <PageHeader title="OUR:NARA Ambassador" />
      {sections.map((section) => (
        <section.Component key={section.key} {...section.props} />
      ))}
    </div>
  );
}
