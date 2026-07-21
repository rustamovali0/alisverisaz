import { EmptyState } from "@/components/common/empty-state";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { RecentList } from "@/components/dashboard/recent-list";
import { StatGrid } from "@/components/dashboard/stat-card";

type ResourcePageProps = {
  title: string;
  description: string;
  totalLabel: string;
  total: number;
  items?: Array<{
    id: string;
    title: string;
    description?: string;
    value?: string;
  }>;
};

export function ResourcePage({
  title,
  description,
  totalLabel,
  total,
  items = [],
}: ResourcePageProps) {
  return (
    <div className="space-y-6">
      <StatGrid
        items={[
          {
            label: totalLabel,
            value: total,
            description,
          },
        ]}
      />
      <DashboardPanel title={title} description={description}>
        {total === 0 ? (
          <EmptyState
            className="min-h-56"
            title="Məlumat yoxdur"
            description="Bu bölmə real Supabase məlumatları ilə dolacaq."
          />
        ) : (
          <RecentList
            items={items}
            emptyTitle="Siyahı boşdur"
            emptyDescription="Say tapıldı, amma göstəriləcək son qeyd yoxdur."
          />
        )}
      </DashboardPanel>
    </div>
  );
}
