import type { CategoryOption } from "@/lib/products/types";
import type { CartProduct } from "@/lib/cart/types";

export function getHomepageProductSections(products: CartProduct[], categories: CategoryOption[] = []) {
  const available = new Map(
    products
      .filter(
        (product) =>
          product.stockTrackingEnabled === false || product.stockQuantity > 0,
      )
      .map((product) => [product.id, product]),
  );

  function take(limit: number, accepts: (product: CartProduct) => boolean) {
    const selected: CartProduct[] = [];
    const stores = new Map<string, number>();
    const categories = new Map<string, number>();
    const candidates = [...available.values()].filter(accepts);
    while (selected.length < limit && candidates.length) {
      const score = (product: CartProduct) =>
        2 * (stores.get(product.storeId) ?? 0) +
        (product.categoryId ? (categories.get(product.categoryId) ?? 0) : 0);
      const index = candidates.reduce(
        (best, product, i) =>
          score(product) < score(candidates[best]) ? i : best,
        0,
      );
      const [product] = candidates.splice(index, 1);
      available.delete(product.id);
      selected.push(product);
      stores.set(product.storeId, (stores.get(product.storeId) ?? 0) + 1);
      if (product.categoryId) {
        categories.set(
          product.categoryId,
          (categories.get(product.categoryId) ?? 0) + 1,
        );
      }
    }
    return selected;
  }

  const vip = take(5, (product) => Boolean(product.isPromoted));
  const rentals = take(5, (product) => product.commerceType === "rental");
  const discounts = take(5, (product) => product.discountAmount > 0);
  const featured = take(Math.min(5, Math.ceil(available.size / 2)), () => true);
  const newest = take(5, () => true);
  const categorySections = [];
  for (const category of categories) {
    if (categorySections.length >= 2 || available.size < 4) break;
    const inCategory = (product: CartProduct) => product.categoryId === category.id;
    if ([...available.values()].filter(inCategory).length >= 2) {
      categorySections.push({ category, products: take(4, inCategory) });
    }
  }
  const storePicks = take(5, () => true);
  return { featured, newest, discounts, storePicks, vip, rentals, categorySections };
}
