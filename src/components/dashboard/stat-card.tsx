type StatCardProps = {
  label: string;
  value: number | string;
  description?: string;
};

export function StatCard({ label, value, description }: StatCardProps) {
  return (
    <article className="premium-card p-4">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-normal text-foreground">
        {value}
      </p>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}
    </article>
  );
}

type StatGridProps = {
  items: StatCardProps[];
};

export function StatGrid({ items }: StatGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <StatCard key={item.label} {...item} />
      ))}
    </div>
  );
}
