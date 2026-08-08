import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { PublicNavigationShell } from "@/components/layout/public-navigation-shell";
import { StructuredData } from "@/components/seo/structured-data";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ToastViewport } from "@/components/ui/toast-viewport";
import { routing, type Locale } from "@/i18n/routing";
import { getMarketplaceStores } from "@/lib/cart/data";
import { getSiteSettings } from "@/lib/cms/data";
import { siteConfig } from "@/lib/config/site";
import { getCategoryOptions } from "@/lib/products/data";

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({
    locale,
  }));
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

function normalizeVisiblePath(pathname: string) {
  const localePrefix = `/${routing.defaultLocale}`;

  if (pathname === localePrefix) {
    return "/";
  }

  if (pathname.startsWith(`${localePrefix}/`)) {
    return pathname.slice(localePrefix.length);
  }

  return pathname || "/";
}

function canBypassMaintenance(pathname: string) {
  return (
    pathname === "/radmin/login" ||
    pathname === "/logout" ||
    pathname.startsWith("/radmin")
  );
}

export async function generateMetadata({
  params,
}: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "seo",
  });
  const siteSettings = await getSiteSettings();
  const seoTitle = siteSettings.defaultSeoTitle || t("title");
  const seoDescription = siteSettings.defaultMetaDescription || t("description");
  const faviconUrl = siteSettings.faviconUrl || undefined;

  return {
    title: {
      default: seoTitle,
      template: `%s | ${siteSettings.shortName || siteSettings.siteName || seoTitle}`,
    },
    description: seoDescription,
    keywords: [
      "alışveriş Azərbaycan",
      "online mağaza",
      "marketplace",
      "məhsul satışı",
      "yeni məhsul satışı",
      "mağaza paneli",
      "səbət və sifariş",
      "e-commerce platforması",
    ],
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(
        routing.locales.map((nextLocale) => [nextLocale, `/${nextLocale}`]),
      ),
    },
    openGraph: {
      type: "website",
      locale: "az_AZ",
      url: `${siteConfig.url}/${locale}`,
      siteName: siteSettings.siteName || siteConfig.name,
      title: seoTitle,
      description: seoDescription,
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: seoDescription,
    },
    icons: faviconUrl
      ? {
          icon: [{ url: faviconUrl }],
          shortcut: [{ url: faviconUrl }],
          apple: [{ url: faviconUrl }],
        }
      : undefined,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const [messages, siteSettings, requestHeaders, navStores, navCategories] = await Promise.all([
    getMessages({
      locale,
    }),
    getSiteSettings(),
    headers(),
    getMarketplaceStores({ locale, limit: 24 }),
    getCategoryOptions({ rootOnly: true }),
  ]);
  const visiblePathname = normalizeVisiblePath(
    requestHeaders.get("x-current-path") ?? `/${locale}`,
  );
  const isMaintenanceBlocked =
    siteSettings.maintenanceMode && !canBypassMaintenance(visiblePathname);

  return (
    <NextIntlClientProvider locale={locale as Locale} messages={messages}>
      <div className="fixed bottom-4 right-4 z-40 hidden items-center gap-2 md:flex">
        <ThemeToggle />
        <LanguageSwitcher />
      </div>
      <ToastViewport />
      <StructuredData />
      {isMaintenanceBlocked ? (
        <main className="grid min-h-screen place-items-center bg-background px-4">
          <EmptyState
            className="rounded-md border bg-card p-8 shadow-sm"
            title="Texniki rejim"
            description="Saytda texniki işlər aparılır. Zəhmət olmasa bir az sonra yenidən yoxlayın."
          />
        </main>
      ) : (
        <PublicNavigationShell
          siteName={siteSettings.shortName || siteSettings.siteName}
          logoUrl={siteSettings.logoUrl}
          darkLogoUrl={siteSettings.darkLogoUrl}
          stores={navStores}
          categories={navCategories}
        >
          {children}
        </PublicNavigationShell>
      )}
    </NextIntlClientProvider>
  );
}
