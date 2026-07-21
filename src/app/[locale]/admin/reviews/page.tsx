import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { AdminReviewList } from "@/components/reviews/admin-review-list";
import { requireRole } from "@/lib/auth/session";
import { getAdminProductReviews } from "@/lib/reviews/data";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  await requireRole(["admin"], "/radmin/reviews");
  const reviews = await getAdminProductReviews();

  return (
    <DashboardPanel
      title="Rəylər və dəyərləndirmələr"
      description="Məhsullara yazılan 5 ulduz rəylər və şərhlər."
    >
      <AdminReviewList reviews={reviews} />
    </DashboardPanel>
  );
}
