import { SellerAnalyticsChart } from "@/components/analytics/seller-analytics-chart";
import { SellerAnalyticsControls } from "@/components/analytics/seller-analytics-controls";
import { FeatureBlocked } from "@/components/dashboard/feature-blocked";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { RecentList } from "@/components/dashboard/recent-list";
import { StatGrid } from "@/components/dashboard/stat-card";
import { Link } from "@/i18n/navigation";
import { getSellerUniqueAnalytics } from "@/lib/analytics/data";
import { parseAnalyticsRange } from "@/lib/analytics/ranges";
import { requireRole } from "@/lib/auth/session";
import { getSellerFeatureAccess } from "@/lib/cms/data";

export const dynamic = "force-dynamic";

type StoreAnalyticsPageProps = {
  searchParams?: Promise<{
    range?: string;
  }>;
};

export default async function StoreAnalyticsPage({
  searchParams,
}: StoreAnalyticsPageProps) {
  const current = await requireRole(["seller"], "/store/dashboard/analytics");
  const enabled = await getSellerFeatureAccess(current.user.id, "analytics");

  if (!enabled) {
    return <FeatureBlocked title="Analitika" />;
  }

  const query = await searchParams;
  const range = parseAnalyticsRange(query?.range);
  const analytics = await getSellerUniqueAnalytics(current.user.id, range);

  return (
    <div className="space-y-6">
      <div className="premium-card flex flex-col gap-4 p-4">
        <div className="flex flex-wrap gap-2">
          {analytics.rangeOptions.map((option) => (
            <Link
              key={option.value}
              href={`/admin/analytics?range=${option.value}`}
              className={
                option.value === range
                  ? "rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                  : "rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold hover:bg-accent"
              }
            >
              {option.label}
            </Link>
          ))}
        </div>
        <SellerAnalyticsControls range={range} hasData={analytics.hasData} />
      </div>
      <StatGrid items={analytics.stats} />
      <DashboardPanel
        title="Baxış qrafiki"
        description="Günlər üzrə məhsul baxışları və mağaza ziyarətləri"
      >
        <SellerAnalyticsChart data={analytics.chart} />
      </DashboardPanel>
      <DashboardPanel title="Top 10 məhsul" description="Ən çox baxılan məhsullar">
        <RecentList
          items={analytics.topProducts}
          emptyTitle="Məhsul baxışı yoxdur"
          emptyDescription="Məhsul səhifələri açıldıqda burada görünəcək."
        />
      </DashboardPanel>
      <DashboardPanel
        title="Mağaza ziyarətləri"
        description="Mağaza səhifəsinə gələn unikal ziyarətlər"
      >
        <RecentList
          items={analytics.storeViews}
          emptyTitle="Mağaza ziyarəti yoxdur"
          emptyDescription="Mağazanız açıldıqda ziyarətlər burada görünəcək."
        />
      </DashboardPanel>
      <DashboardPanel
        title="Son baxış tarixləri"
        description="Məhsul və mağaza üzrə son fəaliyyət qeydləri"
      >
        <RecentList
          items={analytics.recentViews}
          emptyTitle="Fəaliyyət yoxdur"
          emptyDescription="Yeni baxış olduqda tarixçə burada görünəcək."
        />
      </DashboardPanel>
    </div>
  );
}
