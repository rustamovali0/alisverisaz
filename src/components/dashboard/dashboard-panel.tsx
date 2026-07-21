import type { ReactNode } from "react";

type DashboardPanelProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function DashboardPanel({
  title,
  description,
  children,
}: DashboardPanelProps) {
  return (
    <section className="rounded-md border bg-card p-4 text-card-foreground shadow-sm">
      <div className="mb-4 space-y-1">
        <h2 className="text-base font-semibold tracking-normal">{title}</h2>
        {description ? (
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
