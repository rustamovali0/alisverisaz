import { EmptyState } from "@/components/common/empty-state";

type RecentListItem = {
  id: string;
  title: string;
  description?: string;
  value?: string;
};

type RecentListProps = {
  items: RecentListItem[];
  emptyTitle: string;
  emptyDescription: string;
};

export function RecentList({
  items,
  emptyTitle,
  emptyDescription,
}: RecentListProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        className="min-h-48"
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="divide-y">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{item.title}</p>
            {item.description ? (
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {item.description}
              </p>
            ) : null}
          </div>
          {item.value ? (
            <p className="shrink-0 text-sm font-medium text-muted-foreground">
              {item.value}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
