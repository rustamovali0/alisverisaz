import { CartCheckout } from "@/components/cart/cart-checkout";
import { MarketplaceHeader } from "@/components/layout/marketplace-header";
import { requireUser } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/cms/data";

export const dynamic = "force-dynamic";

type CartPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<{
    mode?: string;
  }>;
};

export default async function CartPage({ params, searchParams }: CartPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  await requireUser("/cart");
  const siteSettings = await getSiteSettings();

  return (
    <>
      <MarketplaceHeader siteName={siteSettings.shortName || siteSettings.siteName} />
      <CartCheckout locale={locale} checkoutOnly={query?.mode === "checkout"} />
    </>
  );
}
