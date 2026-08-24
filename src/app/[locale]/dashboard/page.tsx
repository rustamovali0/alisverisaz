import { CustomerAccountHome } from "@/components/customer-account/customer-account-views";
import { requireRole } from "@/lib/auth/session";
import { getCustomerAccountOverview } from "@/lib/customer-account/data";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const current = await requireRole(["customer", "seller"], "/dashboard");
  const overview = await getCustomerAccountOverview(current.user.id);

  return <CustomerAccountHome profile={{
    fullName: current.profile?.full_name ?? null,
    email: current.profile?.email ?? current.user.email ?? null,
    phone: current.profile?.phone ?? null,
    avatarUrl: current.profile?.avatar_url ?? null,
  }} overview={overview} />;
}
