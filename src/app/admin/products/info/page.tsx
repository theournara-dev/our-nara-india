import { getProductInfoTemplate } from "@/data/products";
import { InfoTemplateEditor } from "@/components/admin/info-template-editor";
import { ProductsTabs } from "@/components/admin/products-tabs";

export const dynamic = "force-dynamic";

export default async function InfoTemplatePage() {
  const [local, global] = await Promise.all([
    getProductInfoTemplate("local"),
    getProductInfoTemplate("global"),
  ]);
  const toDrafts = (rows: Awaited<ReturnType<typeof getProductInfoTemplate>>) =>
    rows.map((r) => ({
      heading: r.heading,
      body: r.body,
      visible: true,
    }));

  return (
    <div>
      <ProductsTabs active="info" />
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900">
          Product INFO content
        </h1>
        <p className="text-sm text-zinc-500">
          The storewide &ldquo;MORE INFORMATION&rdquo; content shown in every
          product&apos;s INFO tab, one default per store. A product can override
          either store from its own edit page.
        </p>
      </div>
      <InfoTemplateEditor initial={{ local: toDrafts(local), global: toDrafts(global) }} />
    </div>
  );
}
