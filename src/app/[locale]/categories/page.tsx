import type { Metadata } from "next";
import { ArrowRight, Tags } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { getCategoryIcon } from "@/components/categories/category-icons";
import { ScrollToTopOnMount } from "@/components/common/scroll-to-top-on-mount";
import { SiteFooter } from "@/components/layout/site-footer";
import { Link } from "@/i18n/navigation";
import { getSiteSettings } from "@/lib/cms/data";
import { getCategoryOptions } from "@/lib/products/data";

type CategoriesPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const metadata: Metadata = {
  title: "Kateqoriyalar",
  alternates: {
    canonical: "/categories",
  },
};

export default async function CategoriesPage({ params }: CategoriesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [categories, siteSettings, home] = await Promise.all([
    getCategoryOptions(),
    getSiteSettings(),
    getTranslations("home"),
  ]);
  const rootCategories = categories.filter((category) => !category.parentId);
  const childrenByParentId = categories.reduce((map, category) => {
    if (!category.parentId) {
      return map;
    }

    const children = map.get(category.parentId) ?? [];
    children.push(category);
    map.set(category.parentId, children);

    return map;
  }, new Map<string, typeof categories>());

  return (
    <main className="min-h-screen bg-muted/20 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
      <ScrollToTopOnMount />
      <section className="container py-6 md:py-10">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg border bg-card text-primary shadow-sm">
            <Tags className="size-5" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-black tracking-normal md:text-3xl">
            {home("allCategories")}
          </h1>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rootCategories.map((category) => {
            const CategoryIcon = getCategoryIcon(category);
            const children = childrenByParentId.get(category.id) ?? [];

            return (
              <article
                key={category.id}
                className="min-w-0 rounded-xl border bg-card p-3 shadow-sm"
              >
                <Link
                  href={`/products?category=${category.slug}`}
                  scroll
                  className="group flex min-h-[50px] min-w-0 items-center gap-2 rounded-lg px-1 transition hover:text-primary"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/20">
                    <CategoryIcon className="size-4.5 stroke-[2.1]" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-base font-black">
                    {category.name}
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                </Link>
                {children.length > 0 ? (
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {children.slice(0, 8).map((child) => (
                      <Link
                        key={child.id}
                        href={`/products?category=${child.slug}`}
                        scroll
                        className="min-w-0 truncate rounded-lg bg-muted/55 px-2.5 py-2 text-[13px] font-semibold text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
      <SiteFooter
        siteName={siteSettings.shortName || siteSettings.siteName}
        logoUrl={siteSettings.logoUrl}
        darkLogoUrl={siteSettings.darkLogoUrl}
        description={siteSettings.defaultMetaDescription}
        socialLinks={{
          instagram: siteSettings.socialLinks.instagram,
          tiktok: siteSettings.socialLinks.tiktok,
          whatsapp: siteSettings.socialLinks.whatsapp || siteSettings.whatsapp,
        }}
      />
    </main>
  );
}
