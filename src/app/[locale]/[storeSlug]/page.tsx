import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Storefront } from "@/components/cart/product-marketplace";
import { getMarketplaceStoreBySlug } from "@/lib/cart/data";
import { getCategoryOptions } from "@/lib/products/data";
import { getDepositSettings } from "@/lib/settings/data";
import { getTranslations, setRequestLocale } from "next-intl/server";

type StorePageProps = {
  params: Promise<{
    locale: string;
    storeSlug: string;
  }>;
  searchParams?: Promise<{
    category?: string;
  }>;
};

const reservedSlugs = new Set([
  "admin",
  "radmin",
  "api",
  "cart",
  "dashboard",
  "login",
  "products",
  "register",
  "store",
]);

export async function generateMetadata({
  params,
}: StorePageProps): Promise<Metadata> {
  const { locale, storeSlug } = await params;

  if (reservedSlugs.has(storeSlug)) {
    return {};
  }

  const store = await getMarketplaceStoreBySlug({
    slug: storeSlug,
    locale,
  });

  if (!store) {
    return {};
  }

  return {
    title: `${store.name} | alisveris.az`,
    description:
      store.description ||
      `${store.name} mağazasının elanları və məhsulları alisveris.az-da.`,
    alternates: {
      canonical: `/${store.slug}`,
    },
    openGraph: {
      title: `${store.name} | alisveris.az`,
      description:
        store.description ||
        `${store.name} mağazasının aktiv elanları və məhsulları.`,
      url: `/${store.slug}`,
      images: store.coverUrl ? [store.coverUrl] : undefined,
      type: "website",
    },
  };
}

export default async function StorePage({ params, searchParams }: StorePageProps) {
  const { locale, storeSlug } = await params;
  const search = await searchParams;
  setRequestLocale(locale);

  if (reservedSlugs.has(storeSlug)) {
    notFound();
  }

  const t = await getTranslations("marketplace");
  const common = await getTranslations("common");
  const categories = await getCategoryOptions();
  const selectedCategory = categories.find(
    (category) => category.slug === search?.category || category.id === search?.category,
  );
  const [store, depositSettings] = await Promise.all([
    getMarketplaceStoreBySlug({
      slug: storeSlug,
      locale,
      categoryId: selectedCategory?.id,
    }),
    getDepositSettings(),
  ]);

  if (!store) {
    notFound();
  }

  return (
    <Storefront
      store={store}
      categories={categories.filter(
        (category) =>
          !store.categoryIds.length ||
          store.categoryIds.includes(category.id) ||
          selectedCategory?.id === category.id,
      )}
      selectedCategoryId={selectedCategory?.id}
      depositEnabled={depositSettings.enabled}
      labels={{
        title: t("title"),
        description: t("description"),
        emptyTitle: t("emptyTitle"),
        emptyDescription: t("emptyDescription"),
        stock: t("stock"),
        cart: common("cart"),
      }}
    />
  );
}
