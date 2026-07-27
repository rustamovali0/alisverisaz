import { CartCheckout } from "@/components/cart/cart-checkout";
import { requireUser } from "@/lib/auth/session";

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

  return <CartCheckout locale={locale} checkoutOnly={query?.mode === "checkout"} />;
}
