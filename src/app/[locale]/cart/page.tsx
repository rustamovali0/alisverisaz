import { CartCheckout } from "@/components/cart/cart-checkout";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getMarketplaceProducts } from "@/lib/cart/data";

type CartPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function CartPage({ params }: CartPageProps) {
  const { locale } = await params;
  const current = await getCurrentUserProfile();
  const products = await getMarketplaceProducts(locale);

  return (
    <CartCheckout
      products={products}
      defaultFullName={current?.profile?.full_name ?? ""}
    />
  );
}
