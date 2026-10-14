import { AmbassadorApplyForm } from "@/components/ambassador/apply-form";
import type { AmbassadorProductOption } from "@/components/ambassador/apply-form";
import { AmbassadorStage } from "@/components/ambassador/ambassador-stage";
import type { AmbassadorImageConfig } from "@/lib/page-builder/types";

const perks = [
  "Early access to new product launches",
  "Exclusive ambassador discounts & perks",
  "Free products for featuring reviews & content",
  "Community spotlights and collabs",
];

/**
 * The /ambassador page-builder section: the admin's image sequence beside the
 * application form. Rendered by the page builder, so everything about it —
 * images, order, links, the form's copy — is edited under Pages.
 */
export function AmbassadorSection({
  images,
  formTitle,
  formIntro,
  products,
}: {
  images: AmbassadorImageConfig[];
  formTitle: string;
  formIntro: string;
  products: AmbassadorProductOption[];
}) {
  const form = (
    <AmbassadorApplyForm
      products={products}
      title={formTitle}
      intro={formIntro}
    />
  );

  if (images.length === 0) {
    // No artwork yet: keep the page useful with the perks list beside the form.
    return (
      <div className="mx-auto grid w-full max-w-7xl items-start gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,430px)] lg:px-8">
        <div className="rounded-2xl bg-zinc-50 p-8">
          <ul className="space-y-3">
            {perks.map((perk) => (
              <li key={perk} className="flex items-start gap-3 text-zinc-700">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-point-500" />
                {perk}
              </li>
            ))}
          </ul>
        </div>
        {form}
      </div>
    );
  }

  return (
    <AmbassadorStage
      images={images.map((image) => ({
        id: image.id,
        image: image.image,
        alt: image.alt || undefined,
        href: image.href || undefined,
      }))}
    >
      {form}
    </AmbassadorStage>
  );
}
