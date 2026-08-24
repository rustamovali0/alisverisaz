import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthSplitScreen } from "@/components/auth/auth-split-screen";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUserProfile } from "@/lib/auth/session";

export default async function AdminLoginPage() {
  const current = await getCurrentUserProfile();
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  if (current?.role === "admin") {
    redirect("/radmin");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,hsl(var(--muted)/0.48),hsl(var(--background))_22%)]">
      <div className="min-h-screen px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <AuthSplitScreen variant="admin">
        <Suspense fallback={null}>
          <LoginForm mode="admin" turnstileSiteKey={turnstileSiteKey} />
        </Suspense>
        </AuthSplitScreen>
      </div>
    </main>
  );
}
