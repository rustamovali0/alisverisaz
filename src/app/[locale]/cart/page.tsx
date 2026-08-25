import { CartCheckout } from "@/components/cart/cart-checkout";
import { getCurrentUserProfile } from "@/lib/auth/session";
import {
  getDeliverySettings,
  getDeliveryStoreOverrides,
} from "@/lib/delivery/data";

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
  const [current, deliverySettings, deliveryStoreOverrides] = await Promise.all([
    getCurrentUserProfile(),
    getDeliverySettings(),
    getDeliveryStoreOverrides(),
  ]);

  return (
    <CartCheckout
      locale={locale}
      checkoutOnly={query?.mode === "checkout"}
      defaultFullName={current?.profile?.full_name ?? current?.user.email ?? ""}
      defaultPhone={current?.profile?.phone ?? ""}
      deliverySettings={deliverySettings}
      deliveryStoreOverrides={deliveryStoreOverrides}
    />
  );
}
