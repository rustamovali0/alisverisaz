type ChartPoint = {
  label: string;
  productViews: number;
  storeViews: number;
};

export function SellerAnalyticsChart({ data }: { data: ChartPoint[] }) {
  const max = Math.max(1, ...data.map((item) => item.productViews + item.storeViews));

  if (data.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        Qrafik üçün məlumat yoxdur.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {data.map((item) => {
        const productWidth = `${Math.max(6, (item.productViews / max) * 100)}%`;
        const storeWidth = `${Math.max(6, (item.storeViews / max) * 100)}%`;

        return (
          <div key={item.label} className="grid gap-2 md:grid-cols-[100px_1fr] md:items-center">
            <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
            <div className="grid gap-1">
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: productWidth }} />
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-amber-500" style={{ width: storeWidth }} />
              </div>
            </div>
          </div>
        );
      })}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-primary" />
          Məhsul baxışı
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-amber-500" />
          Mağaza ziyarəti
        </span>
      </div>
    </div>
  );
}
