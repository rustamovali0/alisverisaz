import { CartCheckout } from "@/components/cart/cart-checkout";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getCustomerAddresses, type CustomerAddress } from "@/lib/customer-account/data";
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

function formatDefaultAddress(addresses: CustomerAddress[]) {
  const address = addresses.find((item) => item.isDefault) ?? addresses[0];

  return address
    ? [address.city, address.region, address.address].filter(Boolean).join(", ")
    : "";
}

export default async function CartPage({ params, searchParams }: CartPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  const [current, deliverySettings, deliveryStoreOverrides] = await Promise.all([
    getCurrentUserProfile(),
    getDeliverySettings(),
    getDeliveryStoreOverrides(),
  ]);
  const addresses = current ? await getCustomerAddresses(current.user.id) : [];

  return (
    <CartCheckout
      locale={locale}
      checkoutOnly={query?.mode === "checkout"}
      defaultFullName={current?.profile?.full_name ?? current?.user.email ?? ""}
      defaultPhone={current?.profile?.phone ?? ""}
      defaultAddress={formatDefaultAddress(addresses)}
      isAuthenticated={Boolean(current)}
      deliverySettings={deliverySettings}
      deliveryStoreOverrides={deliveryStoreOverrides}
    />
  );
}
