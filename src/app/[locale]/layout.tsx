import type { Metadata } from "next";
import { headers } from "next/headers";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { StructuredData } from "@/components/seo/structured-data";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ToastViewport } from "@/components/ui/toast-viewport";
import { routing, type Locale } from "@/i18n/routing";
import { getSiteSettings } from "@/lib/cms/data";
import { siteConfig } from "@/lib/config/site";

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

  return {
    title: {
      default: t("title"),
      template: `%s | ${t("title")}`,
    },
    description: t("description"),
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
      siteName: siteConfig.name,
      title: t("title"),
      description: t("description"),
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
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
  const [messages, siteSettings, requestHeaders] = await Promise.all([
    getMessages({
      locale,
    }),
    getSiteSettings(),
    headers(),
  ]);
  const visiblePathname = normalizeVisiblePath(
    requestHeaders.get("x-current-path") ?? `/${locale}`,
  );
  const isMaintenanceBlocked =
    siteSettings.maintenanceMode && !canBypassMaintenance(visiblePathname);

  return (
    <NextIntlClientProvider locale={locale as Locale} messages={messages}>
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
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
        children
      )}
    </NextIntlClientProvider>
  );
}
