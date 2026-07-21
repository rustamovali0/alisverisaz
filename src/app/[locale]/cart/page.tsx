import { CartCheckout } from "@/components/cart/cart-checkout";
import { requireUser } from "@/lib/auth/session";
import { getMarketplaceProducts } from "@/lib/cart/data";

export const dynamic = "force-dynamic";

type CartPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function CartPage({ params }: CartPageProps) {
  const { locale } = await params;
  await requireUser("/cart");
  const products = await getMarketplaceProducts(locale);

  return <CartCheckout products={products} />;
}
