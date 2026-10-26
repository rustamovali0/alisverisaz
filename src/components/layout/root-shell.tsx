import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/site-footer";

type RootShellProps = {
  children: ReactNode;
};

export function RootShell({ children }: RootShellProps) {
  return (
    <>
      <main className="page-shell">
        <div className="page-container flex min-h-[70dvh] items-center justify-center py-8 sm:py-12">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
