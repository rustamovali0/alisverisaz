import { DangerPanel } from "@/components/radmin/danger-panel";
import { requireRadmin } from "@/lib/auth/radmin-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDangerState } from "@/lib/security/danger-state";
import { dangerOff } from "@/lib/security/danger-policy";
import { dangerConfigured, dangerAutoOff, getDangerAutoStatus } from "@/lib/security/danger-auto";

export const dynamic = "force-dynamic";
export default async function DangerPage() {
  await requireRadmin();
  const db = await createSupabaseServerClient({ authScope: "admin" });
  const assurance = await db.auth.mfa.getAuthenticatorAssuranceLevel();
  let state = { ...dangerOff }, automatic = { ...dangerAutoOff }, available = true;
  try { [state, automatic] = await Promise.all([getDangerState(), getDangerAutoStatus()]); } catch { available = false; }
  const configured = dangerConfigured();
  return <DangerPanel automatic={automatic} state={state} available={available} configured={configured} mfaReady={!assurance.error && assurance.data?.currentLevel === "aal2"} />;
}
