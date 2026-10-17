import { CartCheckout } from "@/components/cart/cart-checkout";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getCustomerAddresses, type CustomerAddress } from "@/lib/customer-account/data";
import {
  getDeliverySettings,
  getDeliveryStoreOverrides,
} from "@/lib/delivery/data";
import { headers } from "next/headers";
import { getStoreSubdomainSlug } from "@/lib/config/domains";
import { getMarketplaceStoreBySlug } from "@/lib/cart/data";

type CartPageProps = {
  params: Promise<{
    locale: string;
    storeSlug?: string;
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
  const { locale, storeSlug } = await params;
  const query = await searchParams;
  const requestHeaders = await headers();
  const storeSubdomainSlug = getStoreSubdomainSlug(requestHeaders.get("host"));
  const isolatedStoreSlug = storeSubdomainSlug ?? storeSlug;
  const isolatedStore = isolatedStoreSlug
    ? await getMarketplaceStoreBySlug({ slug: isolatedStoreSlug, locale })
    : null;
  const checkoutOnly = query?.mode === "checkout";
  const [current, deliverySettings, deliveryStoreOverrides] = await Promise.all([
    checkoutOnly ? getCurrentUserProfile() : Promise.resolve(null),
    getDeliverySettings(),
    getDeliveryStoreOverrides(),
  ]);
  const addresses = current ? await getCustomerAddresses(current.user.id) : [];

  return (
    <CartCheckout
      locale={locale}
      checkoutOnly={checkoutOnly}
      defaultFullName={current?.profile?.full_name ?? current?.user.email ?? ""}
      defaultPhone={current?.profile?.phone ?? ""}
      defaultAddress={formatDefaultAddress(addresses)}
      isAuthenticated={Boolean(current)}
      deliverySettings={deliverySettings}
      deliveryStoreOverrides={deliveryStoreOverrides}
      isolatedStoreId={isolatedStore?.id}
      isolatedStoreSlug={isolatedStore?.slug}
      isolatedStoreBaseHref={isolatedStore ? (storeSubdomainSlug ? "/" : `/${isolatedStore.slug}`) : undefined}
    />
  );
}
