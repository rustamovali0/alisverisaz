import type { ReactNode } from "react";
import { Heart, ShoppingCart, UserRound } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
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

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="container flex h-16 items-center gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <span className="grid size-11 place-items-center rounded-lg bg-primary text-lg font-black text-primary-foreground">
              a
            </span>
            <span className="truncate text-xl font-black tracking-normal">
              {siteSettings.shortName || "Alisveris"}
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <Button asChild variant="ghost">
              <Link href="/products">Məhsullar</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/dashboard">Sifarişlərim</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/dashboard/profile">Profil</Link>
            </Button>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button
              asChild
              size="icon"
              variant="outline"
              className="size-12 rounded-lg"
              aria-label="Favorilər"
            >
              <Link href="/favorites">
                <Heart className="size-7" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              size="icon"
              variant="outline"
              className="size-12 rounded-lg"
              aria-label="Səbət"
            >
              <Link href="/cart">
                <ShoppingCart className="size-7" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <Link href="/dashboard">
                <UserRound className="mr-2 size-5" aria-hidden="true" />
                Hesabım
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <section className="border-b bg-card">
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
        </div>
      </section>
      <div className="container py-6">{children}</div>
      <SiteFooter
        siteName={siteSettings.siteName}
        description={siteSettings.defaultMetaDescription}
        socialLinks={siteSettings.socialLinks}
      />
    </main>
  );
}
