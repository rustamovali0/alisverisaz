import { EmptyState } from "@/components/common/empty-state";

export function FeatureBlocked({
  title,
  description = "Tezliklə aktivləşdiriləcək",
}: {
  title: string;
  description?: string;
}) {
  return (
    <EmptyState
      className="min-h-80 rounded-md border bg-card p-8 shadow-sm"
      title={title}
      description={description}
    />
  );
}
