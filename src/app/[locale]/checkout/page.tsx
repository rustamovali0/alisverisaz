import { CartCheckout } from "@/components/cart/cart-checkout";
import { getCurrentUserProfile } from "@/lib/auth/session";
import {
  getDeliverySettings,
  getDeliveryStoreOverrides,
} from "@/lib/delivery/data";

export const dynamic = "force-dynamic";

type CheckoutPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { locale } = await params;
  const [current, deliverySettings, deliveryStoreOverrides] = await Promise.all([
    getCurrentUserProfile(),
    getDeliverySettings(),
    getDeliveryStoreOverrides(),
  ]);

  return (
    <CartCheckout
      locale={locale}
      checkoutOnly
      defaultFullName={current?.profile?.full_name ?? current?.user.email ?? ""}
      defaultPhone={current?.profile?.phone ?? ""}
      deliverySettings={deliverySettings}
      deliveryStoreOverrides={deliveryStoreOverrides}
    />
  );
}
