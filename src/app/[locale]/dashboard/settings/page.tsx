import { EmailPreferences } from "@/components/notifications/email-preferences";
import { getEmailPreferences } from "@/lib/email/preferences";
import { CustomerSettingsView } from "@/components/customer-account/customer-account-views";
import { requireRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function CustomerSettingsPage() {
  await requireRole(["customer", "seller"], "/dashboard/settings");

  return <div className="grid gap-5"><CustomerSettingsView /><EmailPreferences initial={await getEmailPreferences()} /></div>;
}
