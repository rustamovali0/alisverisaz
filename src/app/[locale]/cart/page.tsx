import { CartCheckout } from "@/components/cart/cart-checkout";
import { getCurrentUserProfile } from "@/lib/auth/session";

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
  const current = await getCurrentUserProfile();

  return (
    <CartCheckout
      locale={locale}
      checkoutOnly={query?.mode === "checkout"}
      defaultFullName={current?.profile?.full_name ?? current?.user.email ?? ""}
      defaultPhone={current?.profile?.phone ?? ""}
    />
  );
}
