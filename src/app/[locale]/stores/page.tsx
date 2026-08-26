import type { Metadata } from "next";
import { ArrowRight, Store } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SiteFooter } from "@/components/layout/site-footer";
import { Link } from "@/i18n/navigation";
import { getMarketplaceStores } from "@/lib/cart/data";
import { getSiteSettings } from "@/lib/cms/data";
import { getStorePath } from "@/lib/config/domains";

type StoresPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const metadata: Metadata = {
  title: "Mağazalar",
  alternates: {
    canonical: "/stores",
  },
};

export default async function StoresPage({ params }: StoresPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [stores, siteSettings, home, marketplace] = await Promise.all([
    getMarketplaceStores({ locale, limit: 120 }),
    getSiteSettings(),
    getTranslations("home"),
    getTranslations("marketplace"),
  ]);

  return (
    <main className="min-h-screen bg-muted/20 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
      <section className="container py-6 md:py-10">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg border bg-card text-primary shadow-sm">
            <Store className="size-5" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-black tracking-normal md:text-3xl">
            {home("allStores")}
          </h1>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {stores.map((store) => (
            <Link
              key={store.id}
              href={getStorePath(store.slug)}
              className="group min-w-0 overflow-hidden rounded-lg border bg-card shadow-sm transition hover:border-primary/40 hover:shadow-md"
            >
              <div className="grid aspect-[16/9] place-items-center border-b bg-muted/50 p-4">
                {store.logoUrl ? (
                  <img
                    src={store.logoUrl}
                    alt={store.name}
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                ) : (
                  <span className="grid size-12 place-items-center rounded-lg border bg-background text-lg font-black text-primary">
                    {store.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex min-w-0 items-start justify-between gap-2 p-3">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-black sm:text-base">{store.name}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {marketplace("productCount", { count: store.productCount })}
                  </p>
                </div>
                <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
              </div>
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
