import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/site-footer";

type RootShellProps = {
  children: ReactNode;
};

export function RootShell({ children }: RootShellProps) {
  return (
    <>
      <main className="min-h-[70vh] bg-background">
        <div className="container flex min-h-[70vh] items-center justify-center py-12">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
