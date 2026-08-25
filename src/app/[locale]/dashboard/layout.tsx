import type { ReactNode } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { CustomerDashboardNavigation } from "@/components/dashboard/customer-dashboard-navigation";
import { MobileCustomerDashboard } from "@/components/dashboard/mobile-customer-dashboard";
import { SiteFooter } from "@/components/layout/site-footer";
import { getSiteSettings } from "@/lib/cms/data";
import { requireRole } from "@/lib/auth/session";
import { getTranslations } from "next-intl/server";

type CustomerDashboardLayoutProps = {
  children: ReactNode;
};

export const dynamic = "force-dynamic";

export default async function CustomerDashboardLayout({
  children,
}: CustomerDashboardLayoutProps) {
  const [current, siteSettings] = await Promise.all([
    requireRole(["customer", "seller"], "/dashboard"),
    getSiteSettings(),
  ]);
  const t = await getTranslations("nav");
  const userLabel = current.profile?.full_name ?? current.user.email ?? "İstifadəçi";
  const userContact = current.profile?.phone ?? current.user.email ?? "";
  const navItems = [
    { href: "/dashboard", label: t("dashboard") },
    { href: "/dashboard/orders", label: t("orders") },
    { href: "/dashboard/profile", label: t("profile") },
    { href: "/dashboard/addresses", label: t("addresses") },
    { href: "/dashboard/notifications", label: t("notifications") },
    { href: "/dashboard/security", label: t("security") },
    { href: "/dashboard/settings", label: t("settings") },
  ];

  return (
    <main className="min-h-screen max-w-full overflow-x-clip bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <MobileCustomerDashboard
        userLabel={userLabel}
        userContact={userContact}
        role={current.role as "customer" | "seller"}
      >
        {children}
      </MobileCustomerDashboard>
      <section className="hidden border-b bg-card md:block">
        <div className="container flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-normal">Hesabım</h1>
            <p className="mt-1 text-sm text-muted-foreground">{userLabel}</p>
          </div>
          <LogoutButton />
        </div>
        <CustomerDashboardNavigation items={navItems} />
      </section>
      <div className="container hidden py-6 md:block">{children}</div>
      <div className="hidden md:block">
        <SiteFooter
          siteName={siteSettings.siteName}
          description={siteSettings.defaultMetaDescription}
          socialLinks={siteSettings.socialLinks}
        />
      </div>
    </main>
  );
}
