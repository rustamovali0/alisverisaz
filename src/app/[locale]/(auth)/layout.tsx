import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getDashboardPath } from "@/lib/auth/redirects";
import { getCurrentUserProfile } from "@/lib/auth/session";

type AuthLayoutProps = {
  children: ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export default async function AuthLayout({ children, params }: AuthLayoutProps) {
  const { locale } = await params;
  const current = await getCurrentUserProfile();

  if (current) {
    redirect(`/${locale}${getDashboardPath(current.role)}`);
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container flex min-h-screen items-center justify-center py-12">
        {children}
      </div>
    </main>
  );
}
