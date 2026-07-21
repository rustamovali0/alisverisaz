import { CartCheckout } from "@/components/cart/cart-checkout";
import { requireRole } from "@/lib/auth/session";
import { getMarketplaceProducts } from "@/lib/cart/data";

type CartPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function CartPage({ params }: CartPageProps) {
  const { locale } = await params;
  const current = await requireRole(["customer"], "/cart");
  const products = await getMarketplaceProducts(locale);

  return (
    <CartCheckout
      products={products}
      defaultFullName={current.profile?.full_name ?? ""}
    />
  );
}
