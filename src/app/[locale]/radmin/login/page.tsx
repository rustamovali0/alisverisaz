import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { LoadingState } from "@/components/common/loading-state";
import { getDashboardPath } from "@/lib/auth/redirects";
import { getCurrentUserProfile } from "@/lib/auth/session";

export default async function AdminLoginPage() {
  const current = await getCurrentUserProfile();

  if (current) {
    redirect(getDashboardPath(current.role));
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container flex min-h-screen items-center justify-center py-12">
        <Suspense fallback={<LoadingState label="Admin girişi yüklənir" />}>
          <LoginForm mode="admin" />
        </Suspense>
      </div>
    </main>
  );
}
