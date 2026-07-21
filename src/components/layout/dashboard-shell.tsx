import type { ReactNode } from "react";

import { LogoutButton } from "@/components/auth/logout-button";

type DashboardShellProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function DashboardShell({
  title,
  description,
  children,
}: DashboardShellProps) {
  return (
    <main className="min-h-screen bg-background">
      <div className="container py-8">
        <header className="mb-8 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          <LogoutButton />
        </header>
        {children}
      </div>
    </main>
  );
}
