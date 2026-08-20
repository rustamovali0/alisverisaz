import {
  AdminPlanCreateForm,
  AdminPlanForm,
  AdminStorePlanAssignmentForm,
} from "@/components/subscriptions/admin-plan-form";
import { EmptyState } from "@/components/common/empty-state";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { requireRole } from "@/lib/auth/session";
import {
  getAdminSubscriptionAssignments,
  getSubscriptionPlans,
} from "@/lib/subscriptions/data";

export const dynamic = "force-dynamic";

export default async function AdminSubscriptionsPage() {
  await requireRole(["admin"], "/radmin/subscriptions");
  const [plans, assignments] = await Promise.all([
    getSubscriptionPlans(true),
    getAdminSubscriptionAssignments(),
  ]);

  return (
    <div className="space-y-6">
      <DashboardPanel
        title="Abunəlik planları"
        description="Plan qiyməti və intervalı gələcək ödəniş inteqrasiyası üçün metadata kimi saxlanılır."
      >
        <div className="space-y-4">
          <AdminPlanCreateForm />
          {plans.length === 0 ? (
            <EmptyState
              className="min-h-56"
              title="Plan yoxdur"
              description="Yeni manual assignment üçün əvvəl plan yaradın."
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {plans.map((plan) => (
                <AdminPlanForm key={plan.id} plan={plan} />
              ))}
            </div>
          )}
        </div>
      </DashboardPanel>

      <DashboardPanel
        title="Mağaza plan assignment"
        description="Planlar radmin tərəfindən manual entitlement kimi təyin olunur."
      >
        <div className="space-y-4">
          <AdminStorePlanAssignmentForm assignments={assignments} plans={plans} />
          {assignments.length === 0 ? (
            <EmptyState
              className="min-h-40"
              title="Mağaza yoxdur"
              description="Seller mağazası yaradıldıqda burada görünəcək."
            />
          ) : (
            <div className="divide-y rounded-md border bg-background">
              {assignments.map((assignment) => (
                <div
                  key={assignment.storeId}
                  className="grid gap-3 p-3 text-sm md:grid-cols-[1.2fr_1fr_1fr]"
                >
                  <div>
                    <p className="font-semibold text-foreground">
                      {assignment.storeName}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {assignment.ownerEmail ?? assignment.ownerName ?? "Sahib"}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {assignment.subscription?.planName ?? "Plan təyin edilməyib"}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Status: {assignment.subscription?.status ?? "-"}
                    </p>
                  </div>
                  <div className="text-muted-foreground">
                    <p>Provider: {assignment.subscription?.paymentProvider ?? "-"}</p>
                    <p>Payment status: {assignment.subscription?.paymentStatus ?? "-"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardPanel>
    </div>
  );
}
