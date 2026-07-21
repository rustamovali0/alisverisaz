import { EmptyState } from "@/components/common/empty-state";

export function FeatureBlocked({ title }: { title: string }) {
  return (
    <EmptyState
      className="min-h-80 rounded-md border bg-card p-8 shadow-sm"
      title={`${title} deaktivdir`}
      description="Bu bölmə admin tərəfindən panel idarəetməsində deaktiv edilib."
    />
  );
}
