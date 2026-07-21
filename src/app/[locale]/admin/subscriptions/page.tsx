import { AdminPlanForm } from "@/components/subscriptions/admin-plan-form";
import { EmptyState } from "@/components/common/empty-state";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { requireRole } from "@/lib/auth/session";
import { getSubscriptionPlans } from "@/lib/subscriptions/data";

export default async function AdminSubscriptionsPage() {
  await requireRole(["admin"], "/admin/subscriptions");
  const plans = await getSubscriptionPlans(true);

  return (
    <DashboardPanel
      title="Abunəlik planları"
      description="Admin plan qiymətini, elan limitini və aktiv statusunu dəyişə bilər."
    >
      {plans.length === 0 ? (
        <EmptyState
          className="min-h-56"
          title="Plan yoxdur"
          description="Migration tətbiq olunandan sonra Sadə, VIP və Premium planları görünəcək."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          {plans.map((plan) => (
            <AdminPlanForm key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </DashboardPanel>
  );
}
