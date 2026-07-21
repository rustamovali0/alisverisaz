import type { ReactNode } from "react";

type RootShellProps = {
  children: ReactNode;
};

export function RootShell({ children }: RootShellProps) {
  return (
    <main className="min-h-screen bg-background">
      <div className="container flex min-h-screen items-center justify-center py-12">
        {children}
      </div>
    </main>
  );
}
