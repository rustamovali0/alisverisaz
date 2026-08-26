import { Heart } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ProductGrid } from "@/components/cart/product-marketplace";
import { EmptyState } from "@/components/common/empty-state";
import { SiteFooter } from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth/session";
import { getFavoriteMarketplaceProducts } from "@/lib/cart/data";
import { getActiveHomeThemeSetting, getSiteSettings } from "@/lib/cms/data";

type PublicFavoritesPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function PublicFavoritesPage({ params }: PublicFavoritesPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const current = await requireUser("/favorites");
  const marketplace = await getTranslations("marketplace");
  const [products, siteSettings, activeTheme] = await Promise.all([
    getFavoriteMarketplaceProducts(locale, current.user.id),
    getSiteSettings(),
    getActiveHomeThemeSetting(),
  ]);

  return (
    <main className="min-h-screen bg-muted/40 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
      <div className="container py-5 md:py-8">
        {products.length > 0 ? (
          <ProductGrid
            products={products}
            productCardVariant={activeTheme.productCardVariant}
            labels={{ stock: marketplace("stock") }}
          />
        ) : (
          <EmptyState
            className="min-h-[55vh] rounded-xl border bg-card"
            title="Seçilmiş məhsul yoxdur"
            description="Bəyəndiyiniz məhsulları ürək işarəsi ilə seçilmişlərə əlavə edin."
            icon={<Heart className="size-8" aria-hidden="true" />}
            action={
              <Button asChild>
                <Link href="/products">Məhsullara bax</Link>
              </Button>
            }
          />
        )}
      </div>
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
