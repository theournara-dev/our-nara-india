import Link from "next/link";
import type { ProductCard as ProductCardType } from "@/data/products";
import { formatMoney } from "@/lib/money";

/**
 * Product card rendered with the original Cafe24 theme markup/classes so the
 * imported theme CSS styles it one-to-one. Renders the inner content only —
 * the surrounding <li class="swiper-slide"> is provided by the carousel.
 */
export function ThemeProductCard({ product }: { product: ProductCardType }) {
  return (
    <>
      <div className="thumbnail">
        <div className="prdImg round">
          <Link href={`/products/${product.slug}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.images[0]}
              alt={product.name}
              className="thumbImg -hover"
            />
          </Link>
        </div>
      </div>
      <div className="description">
        <strong className="name">
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </strong>
        <ul className="xans-element- xans-product xans-product-listitem spec">
          <li className="displayBrand">
            <span>{product.brand.name}</span>
          </li>
          <li className="displayProductSummary">
            <span>{product.shortTags.join(" · ")}</span>
          </li>
          <li className="displayPrice">
            <span>{formatMoney(product.priceCents, product.currency)}</span>
          </li>
        </ul>
      </div>
    </>
  );
}
