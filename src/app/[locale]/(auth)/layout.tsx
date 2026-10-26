import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { getDashboardPath } from "@/lib/auth/redirects";
import { normalizeNextPath } from "@/lib/auth/safe-redirect";
import { getCurrentUserProfile } from "@/lib/auth/session";

type AuthLayoutProps = {
  children: ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

function getSafeNextPath(currentUrl: string) {
  const query = currentUrl.includes("?") ? currentUrl.slice(currentUrl.indexOf("?")) : "";
  const next = new URLSearchParams(query).get("next") ?? "";

  return normalizeNextPath(next);
}

export default async function AuthLayout({ children, params }: AuthLayoutProps) {
  await params;
  const headerList = await headers();
  const pathname = headerList.get("x-current-path") ?? "";
  const currentUrl = headerList.get("x-current-url") ?? pathname;
  const current = await getCurrentUserProfile();

  if (
    current &&
    current.role !== "admin" &&
    pathname !== "/forgot-password" &&
    pathname !== "/reset-password"
  ) {
    redirect(getSafeNextPath(currentUrl) || getDashboardPath(current.role));
  }

  return (
    <main className="min-h-[calc(100dvh-4.75rem)] bg-slate-50 dark:bg-slate-950">
      <div className="min-h-full px-3 py-3 sm:px-6 sm:py-4 lg:px-8 lg:py-4">
        {children}
      </div>
    </main>
  );
}
