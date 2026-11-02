import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminMfaForm } from "@/components/security/admin-mfa-form";
export const dynamic = "force-dynamic";
export default async function AdminMfaPage() {
  const current = await getCurrentUserProfile("admin");
  if (!current || current.role !== "admin") redirect("/radmin/login");
  const db = await createSupabaseServerClient({ authScope: "admin" });
  const { data, error } = await db.auth.mfa.listFactors();
  if (error) throw Error("Təhlükəsizlik faktoru oxunmadı.");
  return (
    <main className="mx-auto max-w-md space-y-5 px-4 py-10">
      <h1 className="text-2xl font-bold">Admin təhlükəsizlik təsdiqi</h1>
      <p>Hesabınıza bağlı Authenticator tətbiqindən istifadə edin.</p>
      <AdminMfaForm
        factors={(data?.totp || [])
          .filter((f) => f.status === "verified")
          .map((f) => ({
            id: f.id,
            label: f.friendly_name || "Authenticator",
          }))}
      />
    </main>
  );
}
