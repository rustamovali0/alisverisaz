import type { CartProduct } from "@/lib/cart/types";
import { formatAznPrice } from "@/lib/format";

export function ProductDetailPrice({ product, stock, unitPrice = Math.max(0, product.priceAmount - product.discountAmount), hasVariantPrice = false }: {
  product: CartProduct;
  stock: number;
  unitPrice?: number;
  hasVariantPrice?: boolean;
}) {
  const showDiscount = !hasVariantPrice && product.discountAmount > 0 && unitPrice < product.priceAmount;

  return (
    <div className="pdp-pricing" aria-live="polite">
      <div className="pdp-price-row">
        <strong>{formatAznPrice(unitPrice)}</strong>
        {showDiscount && (
          <>
            <del>{formatAznPrice(product.priceAmount)}</del>
            <span className="pdp-discount">−{Math.round((1 - unitPrice / product.priceAmount) * 100)}%</span>
          </>
        )}
      </div>
      {(stock <= 0 || product.stockTrackingEnabled !== false) && (
        <p className={stock > 0 ? "pdp-stock" : "pdp-stock pdp-out-of-stock"}>
          {stock > 0 ? `Stokda · ${stock} ədəd` : "Stokda yoxdur"}
        </p>
      )}
    </div>
  );
}
