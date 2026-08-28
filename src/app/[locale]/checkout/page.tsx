import { CartCheckout } from "@/components/cart/cart-checkout";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getCustomerAddresses, type CustomerAddress } from "@/lib/customer-account/data";
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

function formatDefaultAddress(addresses: CustomerAddress[]) {
  const address = addresses.find((item) => item.isDefault) ?? addresses[0];

  return address
    ? [address.city, address.region, address.address].filter(Boolean).join(", ")
    : "";
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { locale } = await params;
  const [current, deliverySettings, deliveryStoreOverrides] = await Promise.all([
    getCurrentUserProfile(),
    getDeliverySettings(),
    getDeliveryStoreOverrides(),
  ]);
  const addresses = current ? await getCustomerAddresses(current.user.id) : [];

  return (
    <CartCheckout
      locale={locale}
      checkoutOnly
      defaultFullName={current?.profile?.full_name ?? current?.user.email ?? ""}
      defaultPhone={current?.profile?.phone ?? ""}
      defaultAddress={formatDefaultAddress(addresses)}
      isAuthenticated={Boolean(current)}
      deliverySettings={deliverySettings}
      deliveryStoreOverrides={deliveryStoreOverrides}
    />
  );
}
