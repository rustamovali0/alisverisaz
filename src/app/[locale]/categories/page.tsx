import type { Metadata } from "next";
import { ArrowRight, Tags } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

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
    getCategoryOptions({ rootOnly: true }),
    getSiteSettings(),
    getTranslations("home"),
  ]);

  return (
    <main className="min-h-screen bg-muted/20 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
      <section className="container py-6 md:py-10">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg border bg-card text-primary shadow-sm">
            <Tags className="size-5" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-black tracking-normal md:text-3xl">
            {home("allCategories")}
          </h1>
        </div>
        <div className="grid grid-cols-1 gap-3 min-[460px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/products?category=${category.slug}`}
              className="group flex min-h-24 items-center justify-between rounded-lg border bg-card px-4 py-3 shadow-sm transition hover:border-primary/40 hover:shadow-md"
            >
              <span className="min-w-0 break-words text-base font-bold">
                {category.name}
              </span>
              <ArrowRight className="ml-3 size-5 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
          ))}
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
