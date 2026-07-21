import { CartCheckout } from "@/components/cart/cart-checkout";
import { getMarketplaceProducts } from "@/lib/cart/data";

export const dynamic = "force-dynamic";

type CartPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function CartPage({ params }: CartPageProps) {
  const { locale } = await params;
  const products = await getMarketplaceProducts(locale);

  return <CartCheckout products={products} />;
}
