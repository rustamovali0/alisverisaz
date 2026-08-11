import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DashboardPanelProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function DashboardPanel({
  title,
  description,
  children,
  className,
}: DashboardPanelProps) {
  return (
    <section className={cn("premium-card p-4", className)}>
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
