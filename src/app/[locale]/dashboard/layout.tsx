import type { ReactNode } from "react";
import {
  Bell,
  ChevronRight,
  CreditCard,
  Heart,
  MapPin,
  MessageCircle,
  Package,
  Settings,
  ShoppingCart,
  UserRound,
} from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { ThemeToggle } from "@/components/theme/theme-toggle";
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
      <section className="bg-white px-6 pb-7 pt-10 text-[hsl(var(--marketplace-navy))] dark:bg-background dark:text-foreground md:hidden">
        <div className="mb-7 flex items-center justify-between">
          <h1 className="text-[34px] font-black leading-none tracking-normal">Kabinet</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="relative size-12 rounded-full text-[hsl(var(--marketplace-muted))]"
              aria-label="Bildirişlər"
            >
              <Link href="/dashboard/messages">
                <Bell className="size-8" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
        <Link
          href="/dashboard/profile"
          className="mb-7 grid min-w-0 grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-border dark:bg-card"
        >
          <span className="relative grid size-16 place-items-center rounded-full bg-slate-100 text-slate-500">
            <UserRound className="size-9" aria-hidden="true" />
            <span className="absolute bottom-0 right-0 size-5 rounded-full border-2 border-white bg-emerald-500" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xl font-black">{userLabel}</span>
            {userContact ? (
              <span className="mt-1 block truncate text-base text-[hsl(var(--marketplace-muted))]">{userContact}</span>
            ) : null}
          </span>
          <ChevronRight className="size-7 text-[hsl(var(--marketplace-muted))]" aria-hidden="true" />
        </Link>
        <div className="space-y-1">
          {[
            { href: "/dashboard", label: "Mənim sifarişlərim", icon: Package },
            { href: "/favorites", label: "Seçilmişlər", icon: Heart },
            { href: "/cart", label: "Səbət", icon: ShoppingCart },
            { href: "/dashboard/messages", label: "Mesajlar", icon: MessageCircle },
            { href: "/dashboard/payments", label: "Ödənişlər", icon: CreditCard },
            { href: "/dashboard/profile", label: "Ünvan və profil məlumatları", icon: MapPin },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="grid min-h-[72px] grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-4 border-b border-slate-100 text-[hsl(var(--marketplace-navy))] dark:border-border dark:text-foreground"
              >
                <Icon className="size-8" strokeWidth={1.9} aria-hidden="true" />
                <span className="min-w-0 truncate text-xl font-medium">{item.label}</span>
                <ChevronRight className="size-7 text-[hsl(var(--marketplace-muted))]" aria-hidden="true" />
              </Link>
            );
          })}
        </div>
        <div className="mt-8 border-t-8 border-slate-100 pt-6 dark:border-muted">
          <Link
            href="/dashboard/profile"
            className="grid min-h-[72px] grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-4 text-[hsl(var(--marketplace-navy))] dark:text-foreground"
          >
            <Settings className="size-8" strokeWidth={1.9} aria-hidden="true" />
            <span className="min-w-0 truncate text-xl font-medium">Ayarlar</span>
            <ChevronRight className="size-7 text-[hsl(var(--marketplace-muted))]" aria-hidden="true" />
          </Link>
        </div>
      </section>
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
            <Link href="/dashboard">Sifarişlərim</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/profile">Profil</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/messages">Mesajlar</Link>
          </Button>
        </div>
      </section>
      <div className="container py-6 md:py-6">{children}</div>
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
