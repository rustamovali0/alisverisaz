import { CustomerAddressesView } from "@/components/customer-account/customer-account-views";
import { requireRole } from "@/lib/auth/session";
import { getCustomerAddresses } from "@/lib/customer-account/data";

export const dynamic = "force-dynamic";

export default async function CustomerAddressesPage() {
  const current = await requireRole(["customer", "seller"], "/dashboard/addresses");
  const addresses = await getCustomerAddresses(current.user.id);

  return <CustomerAddressesView addresses={addresses} defaultPhone={current.profile?.phone} />;
}
