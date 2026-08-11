import { CartCheckout } from "@/components/cart/cart-checkout";

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

  return <CartCheckout locale={locale} checkoutOnly={query?.mode === "checkout"} />;
}
