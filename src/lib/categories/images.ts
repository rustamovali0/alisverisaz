export const DEFAULT_CATEGORY_IMAGES: Record<string, string> =
  Object.fromEntries(
    [
      "elektronika",
      "ev-ve-bag",
      "moda",
      "gozellik-ve-baxim",
      "ana-ve-usaq",
      "idman-ve-outdoor",
      "avto-mehsullari",
      "tikinti-ve-aletler",
      "ofis-ve-defterxana",
      "kitablar",
      "ev-heyvanlari",
      "qida-ve-ickiler",
    ].map((slug) => [slug, `/marketplace/categories/${slug}.jpg`]),
  );
export function getCategoryImage(category: {
  slug: string;
  imageUrl?: string | null;
}) {
  return category.imageUrl || DEFAULT_CATEGORY_IMAGES[category.slug] || null;
}
