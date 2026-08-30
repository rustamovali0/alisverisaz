import { EmptyState } from "@/components/common/empty-state";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { AdminStoreProductLimitForm } from "@/components/subscriptions/admin-plan-form";
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
        <div className="grid gap-3">
          {assignments.map((assignment) => (
            <div
              key={assignment.storeId}
              className="grid gap-4 rounded-lg border bg-background p-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(18rem,0.9fr)] md:items-center"
            >
              <div className="min-w-0">
                <p className="truncate text-base font-black">
                  {assignment.storeName}
                </p>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {assignment.ownerEmail ?? assignment.ownerName ?? "Satıcı"}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {assignment.storeSlug ? `/${assignment.storeSlug}` : "Slug yoxdur"}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm md:grid-cols-1">
                <div className="rounded-md border bg-card p-2">
                  <p className="text-xs text-muted-foreground">İstifadə</p>
                  <p className="mt-1 font-black">{assignment.productCount}</p>
                </div>
                <div className="rounded-md border bg-card p-2">
                  <p className="text-xs text-muted-foreground">Limit</p>
                  <p className="mt-1 font-black">
                    {assignment.effectiveProductLimit ?? "Limitsiz"}
                  </p>
                </div>
                <div className="rounded-md border bg-card p-2">
                  <p className="text-xs text-muted-foreground">Qalan</p>
                  <p className="mt-1 font-black">
                    {assignment.remainingProducts === null
                      ? "Limitsiz"
                      : assignment.remainingProducts}
                  </p>
                </div>
              </div>
              <AdminStoreProductLimitForm
                assignment={assignment}
                defaultProductLimit={defaultProductLimit}
              />
            </div>
          ))}
        </div>
      )}
    </DashboardPanel>
  );
}
