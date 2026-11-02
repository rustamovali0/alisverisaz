import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export function mfaRequirement(
  current: string | null,
  next: string | null,
  policy: string,
) {
  if (policy === "off" || current === "aal2") return null;
  return next === "aal2" ? "verify" : policy === "required" ? "enroll" : null;
}
export async function assertAdminMfa() {
  const policy = process.env.ADMIN_MFA_POLICY || "off";
  if (policy === "off") return;
  const db = await createSupabaseServerClient({ authScope: "admin" });
  const { data, error } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) throw Error("Admin təhlükəsizlik yoxlaması alınmadı.");
  if (mfaRequirement(data.currentLevel, data.nextLevel, policy))
    redirect("/radmin/mfa");
}
