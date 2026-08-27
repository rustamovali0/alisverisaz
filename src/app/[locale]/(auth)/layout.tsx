import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { getDashboardPath } from "@/lib/auth/redirects";
import { getCurrentUserProfile } from "@/lib/auth/session";

type AuthLayoutProps = {
  children: ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export default async function AuthLayout({ children, params }: AuthLayoutProps) {
  await params;
  const headerList = await headers();
  const pathname = headerList.get("x-current-path") ?? "";
  const current = await getCurrentUserProfile();

  if (
    current &&
    current.role !== "admin" &&
    pathname !== "/forgot-password" &&
    pathname !== "/reset-password"
  ) {
    redirect(getDashboardPath(current.role));
  }

  return (
    <main className="h-[calc(100dvh-4.75rem)] overflow-hidden bg-[linear-gradient(180deg,hsl(var(--muted)/0.48),hsl(var(--background))_22%)]">
      <div className="h-full overflow-hidden px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        {children}
      </div>
    </main>
  );
}
