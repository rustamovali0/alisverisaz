import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUserProfile } from "@/lib/auth/session";

export default async function AdminLoginPage() {
  const current = await getCurrentUserProfile();

  if (current?.role === "admin") {
    redirect("/radmin");
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container flex min-h-screen items-center justify-center py-12">
        <Suspense fallback={null}>
          <LoginForm mode="admin" />
        </Suspense>
      </div>
    </main>
  );
}
