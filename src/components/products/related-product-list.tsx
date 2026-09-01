"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ProductGrid } from "@/components/cart/product-marketplace";
import { Button } from "@/components/ui/button";
import type { CartProduct } from "@/lib/cart/types";

type RelatedProductListProps = {
  initialProducts: CartProduct[];
  initialCursor: string | null;
  initialHasMore: boolean;
  productId: string;
  categoryId: string;
  locale: string;
};

function mergeProducts(current: CartProduct[], nextProducts: CartProduct[]) {
  const ids = new Set(current.map((product) => product.id));
  return [...current, ...nextProducts.filter((product) => !ids.has(product.id))];
}

export function RelatedProductList({
  initialProducts,
  initialCursor,
  initialHasMore,
  productId,
  categoryId,
  locale,
}: RelatedProductListProps) {
  const t = useTranslations("marketplace");
  const [products, setProducts] = useState(initialProducts);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);

  async function loadMore() {
    if (isLoading || !hasMore || !cursor) {
      return;
    }

    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        productId,
        categoryId,
        locale,
        cursor,
        limit: "20",
      });
      const response = await fetch(`/api/marketplace/related-products?${params}`);

      if (!response.ok) {
        throw new Error("RELATED_PRODUCTS_FAILED");
      }

      const page = (await response.json()) as {
        products: CartProduct[];
        nextCursor: string | null;
        hasMore: boolean;
      };
      setProducts((current) => mergeProducts(current, page.products));
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch {
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }

  if (!products.length) {
    return null;
  }

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3 md:mb-5">
        <div>
          <h2 className="text-xl font-semibold tracking-normal text-slate-950 dark:text-slate-50 md:text-2xl">{t("similarProducts")}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("sameCategoryProducts")}</p>
        </div>
      </div>
      <ProductGrid products={products} labels={{ stock: t("stock") }} layout="related" />
      {hasMore ? (
        <div className="mt-4 flex justify-center md:hidden">
          <Button type="button" variant="outline" onClick={loadMore} disabled={isLoading}>
            {isLoading ? t("loadingMore") : t("showMore")}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
