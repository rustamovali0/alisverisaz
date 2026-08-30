import { EmptyState } from "@/components/common/empty-state";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { AdminListingLimitsManager } from "@/components/subscriptions/admin-listing-limits-manager";
import { requireRole } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/cms/data";
import { getAdminSubscriptionAssignments } from "@/lib/subscriptions/data";

export const dynamic = "force-dynamic";

export default async function AdminListingLimitsPage() {
  await requireRole(["admin"], "/radmin/listing-limits");
  const [assignments, settings] = await Promise.all([
    getAdminSubscriptionAssignments(),
    getSiteSettings(),
  ]);
  const defaultProductLimit = settings.subscriptionLimits.defaultProductLimit ?? 100;

  return (
    <DashboardPanel
      title="Elan limitləri"
      description="Hər satıcının neçə məhsul və elan əlavə edə biləcəyini fərdi şəkildə idarə edin."
    >
      {assignments.length === 0 ? (
        <EmptyState
          className="min-h-56"
          title="Satıcı mağazası yoxdur"
          description="Satıcı mağazası yaradıldıqda elan limiti burada görünəcək."
        />
      ) : (
        <AdminListingLimitsManager
          assignments={assignments}
          defaultProductLimit={defaultProductLimit}
        />
      )}
    </DashboardPanel>
  );
}
