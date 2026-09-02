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
    <main className="min-h-screen bg-slate-50 pb-[calc(90px+env(safe-area-inset-bottom))] text-slate-950 dark:bg-slate-950 dark:text-slate-50 md:pb-0">
      <section className="container max-w-[1280px] py-8 md:py-12">
        <div className="mb-6 flex min-w-0 items-end justify-between gap-4 md:mb-8">
          <div className="min-w-0">
            <p className="mb-2 text-sm font-semibold text-blue-600 dark:text-blue-300">
              Mağazalar
            </p>
            <h1 className="text-2xl font-semibold leading-tight tracking-normal text-slate-950 dark:text-slate-50 md:text-[28px]">
              {home("allStores")}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400 md:text-base">
              Platformadakı mağazaları kəşf et.
            </p>
          </div>
          <span className="hidden size-12 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-blue-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900 dark:text-blue-300 sm:grid">
            <Store className="size-5" aria-hidden="true" />
          </span>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-4 min-[520px]:grid-cols-2 md:grid-cols-3 md:gap-5 xl:grid-cols-4">
          {stores.map((store) => {
            const coverUrl = store.coverUrl || store.sampleProducts[0]?.imageUrl || null;

            return (
              <Link
                key={store.id}
                href={getStorePath(store.slug)}
                className="group min-w-0 overflow-hidden rounded-[14px] border border-slate-200 bg-white text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 md:hover:-translate-y-0.5 md:hover:border-slate-300 md:hover:shadow-[0_8px_30px_rgba(15,23,42,0.07)] md:dark:hover:border-slate-700"
              >
                <div className="relative">
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800">
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt={store.name}
                        className="h-full w-full object-cover object-center transition duration-200 md:group-hover:scale-[1.015]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center bg-[linear-gradient(135deg,#f8fafc,#e2e8f0)] dark:bg-[linear-gradient(135deg,#1e293b,#0f172a)]">
                        <span className="grid size-16 place-items-center rounded-xl border border-slate-200 bg-white text-xl font-semibold text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300">
                          {store.name.slice(0, 1).toLocaleUpperCase("az-AZ")}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-950/28 to-transparent" />
                  </div>
                  <span className="absolute -bottom-7 left-5 z-20 grid size-14 place-items-center overflow-hidden rounded-xl border-2 border-white bg-white text-lg font-semibold text-blue-600 shadow-md shadow-slate-950/10 dark:border-slate-900 dark:bg-slate-900 dark:text-blue-300 md:-bottom-8 md:size-16 md:text-xl">
                    {store.logoUrl ? (
                      <img
                        src={store.logoUrl}
                        alt={`${store.name} logo`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      store.name.slice(0, 1).toLocaleUpperCase("az-AZ")
                    )}
                  </span>
                </div>
                <div className="min-w-0 px-4 pb-4 pt-10 md:pt-12">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="line-clamp-2 break-words text-[15px] font-semibold leading-5 sm:text-base">
                        {store.name}
                      </h2>
                      <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                        {marketplace("productCount", { count: store.productCount })}
                      </p>
                    </div>
                    <ArrowRight className="mt-1 size-4 shrink-0 text-slate-400 transition md:group-hover:translate-x-0.5 md:group-hover:text-blue-600" />
                  </div>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 transition md:group-hover:text-blue-700 dark:text-blue-300 md:dark:group-hover:text-blue-200">
                    Mağazaya bax
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </span>
                </div>
              </Link>
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
