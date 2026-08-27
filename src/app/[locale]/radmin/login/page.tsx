import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUserProfile } from "@/lib/auth/session";

export default async function AdminLoginPage() {
  const current = await getCurrentUserProfile();
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  if (current?.role === "admin") {
    redirect("/radmin");
  }

  return (
    <main className="grid min-h-screen place-items-center overflow-hidden bg-[#040807] px-4 py-6 text-emerald-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.18),transparent_34%),linear-gradient(135deg,rgba(16,185,129,0.08),transparent_42%)]" aria-hidden="true" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(52,211,153,0.45)_1px,transparent_1px),linear-gradient(90deg,rgba(52,211,153,0.45)_1px,transparent_1px)] [background-size:44px_44px]" aria-hidden="true" />
      <div className="relative w-full max-w-[460px]">
        <div className="mb-0 flex items-center justify-between rounded-t-xl border border-b-0 border-emerald-500/25 bg-black/55 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-rose-400" />
            <span className="size-3 rounded-full bg-amber-300" />
            <span className="size-3 rounded-full bg-emerald-400" />
          </div>
          <p className="font-mono text-[11px] font-black uppercase tracking-[0.28em] text-emerald-300">
            Təhlükəsiz giriş
          </p>
        </div>
        <div className="rounded-b-xl border border-emerald-500/25 bg-black/45 p-4 shadow-2xl shadow-emerald-950/30 backdrop-blur-xl">
          <p className="mb-4 font-mono text-xs text-emerald-300">
            admin@alisveris.az:~$ giriş --təhlükəsiz
          </p>
          <Suspense fallback={null}>
            <LoginForm mode="admin" turnstileSiteKey={turnstileSiteKey} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
