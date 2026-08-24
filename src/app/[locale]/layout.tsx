import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { PublicNavigationShell } from "@/components/layout/public-navigation-shell";
import { ScrollToTopButton } from "@/components/layout/scroll-to-top-button";
import { StructuredData } from "@/components/seo/structured-data";
import { ToastViewport } from "@/components/ui/toast-viewport";
import { routing, type Locale } from "@/i18n/routing";
import { getMarketplaceStores } from "@/lib/cart/data";
import { getSiteSettings } from "@/lib/cms/data";
import { siteConfig } from "@/lib/config/site";
import { buildDesignCssVariables } from "@/lib/design/presets";
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
  for (const locale of routing.locales) {
    const localePrefix = `/${locale}`;

    if (pathname === localePrefix) {
      return "/";
    }

    if (pathname.startsWith(`${localePrefix}/`)) {
      return pathname.slice(localePrefix.length);
    }
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

function shouldLoadPublicNavigation(pathname: string) {
  const hiddenExactPaths = new Set([
    "/forgot-password",
    "/login",
    "/logout",
    "/register",
    "/reset-password",
  ]);

  if (hiddenExactPaths.has(pathname)) {
    return false;
  }

  return !["/admin", "/radmin", "/store/dashboard"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
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
  const requestHeaders = await headers();
  const visiblePathname = normalizeVisiblePath(
    requestHeaders.get("x-current-path") ?? "/",
  );

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
      canonical: visiblePathname,
      languages: {
        "x-default": visiblePathname,
      },
    },
    openGraph: {
      type: "website",
      locale: "az_AZ",
      url: `${siteConfig.url}${visiblePathname === "/" ? "" : visiblePathname}`,
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
  const requestHeaders = await headers();
  const visiblePathname = normalizeVisiblePath(
    requestHeaders.get("x-current-path") ?? "/",
  );
  const loadPublicNavigation = shouldLoadPublicNavigation(visiblePathname);
  const [messages, siteSettings, navStores, navCategories] = await Promise.all([
    getMessages({
      locale,
    }),
    getSiteSettings(),
    loadPublicNavigation
      ? getMarketplaceStores({ locale, limit: 24 })
      : Promise.resolve([]),
    loadPublicNavigation
      ? getCategoryOptions({ rootOnly: true })
      : Promise.resolve([]),
  ]);
  const isMaintenanceBlocked =
    siteSettings.maintenanceMode && !canBypassMaintenance(visiblePathname);

  return (
    <NextIntlClientProvider locale={locale as Locale} messages={messages}>
      <div
        className="global-loader-root min-h-screen"
        data-loader-type={siteSettings.globalLoader.type}
        data-loader-palette={siteSettings.globalLoader.palette}
        data-loading-preset={siteSettings.design.loadingPreset}
        data-loader-size={siteSettings.design.loaderSize}
        data-loader-speed={siteSettings.design.loaderSpeed}
        data-loader-text={siteSettings.design.loaderText}
        data-loader-overlay={siteSettings.design.loaderOverlay}
        data-design-theme={siteSettings.design.themePreset}
        data-navbar-preset={siteSettings.design.navbarPreset}
        data-homepage-preset={siteSettings.design.homepagePreset}
        data-product-card-preset={siteSettings.design.productCardPreset}
        data-product-detail-preset={siteSettings.design.productDetailPreset}
        data-seller-panel-preset={siteSettings.design.sellerPanelPreset}
        data-customer-panel-preset={siteSettings.design.customerPanelPreset}
        data-admin-panel-preset={siteSettings.design.adminPanelPreset}
        data-button-preset={siteSettings.design.buttonPreset}
        data-input-preset={siteSettings.design.inputPreset}
        data-card-preset={siteSettings.design.cardPreset}
        data-spacing-preset={siteSettings.design.spacingPreset}
        data-typography-preset={siteSettings.design.typographyPreset}
        style={buildDesignCssVariables(siteSettings.design)}
      >
        <ScrollToTopButton />
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
            mobileNavbarVariant={siteSettings.mobileNavbarVariant}
          >
            {children}
          </PublicNavigationShell>
        )}
      </div>
    </NextIntlClientProvider>
  );
}
