import type { ReactNode } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { MobileCustomerDashboard } from "@/components/dashboard/mobile-customer-dashboard";
import { SiteFooter } from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getSiteSettings } from "@/lib/cms/data";
import { requireRole } from "@/lib/auth/session";

type CustomerDashboardLayoutProps = {
  children: ReactNode;
};

export const dynamic = "force-dynamic";

export default async function CustomerDashboardLayout({
  children,
}: CustomerDashboardLayoutProps) {
  const [current, siteSettings] = await Promise.all([
    requireRole(["customer"], "/dashboard"),
    getSiteSettings(),
  ]);
  const userLabel = current.profile?.full_name ?? current.user.email ?? "İstifadəçi";
  const userContact = current.profile?.phone ?? current.user.email ?? "";

  return (
    <main className="min-h-screen bg-background pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <MobileCustomerDashboard userLabel={userLabel} userContact={userContact}>
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
        <div className="container flex gap-2 overflow-x-auto pb-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">İcmal</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/orders">Sifarişlərim</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/favorites">Sevimlilər</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/notifications">Bildirişlər</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/addresses">Ünvanlar</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/profile">Profil</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/settings">Ayarlar</Link>
          </Button>
        </div>
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
