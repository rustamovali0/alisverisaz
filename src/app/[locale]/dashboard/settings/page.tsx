import { CustomerSettingsView } from "@/components/customer-account/customer-account-views";
import { requireRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function CustomerSettingsPage() {
  await requireRole(["customer"], "/dashboard/settings");

  return <CustomerSettingsView />;
}
