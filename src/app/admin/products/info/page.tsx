import { db } from "@/lib/db";
import { parseInfoRows } from "@/data/products";
import { InfoTemplateEditor } from "@/components/admin/info-template-editor";
import { ProductsTabs } from "@/components/admin/products-tabs";

export const dynamic = "force-dynamic";

export default async function InfoTemplatePage() {
  const row = await db.productInfoTemplate.findUnique({
    where: { key: "default" },
    select: { blocks: true },
  });

  return (
    <div>
      <ProductsTabs active="info" />
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900">
          Product INFO content
        </h1>
        <p className="text-sm text-zinc-500">
          The storewide &ldquo;MORE INFORMATION&rdquo; content shown in every
          product&apos;s INFO tab. A product can override it from its own edit
          page.
        </p>
      </div>
      <InfoTemplateEditor
        initial={parseInfoRows(row?.blocks).map((r) => ({
          heading: r.heading,
          body: r.body,
          visible: true,
        }))}
      />
    </div>
  );
}
