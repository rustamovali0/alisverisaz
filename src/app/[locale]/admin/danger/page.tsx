import { DangerPanel } from "@/components/radmin/danger-panel";
import { requireRadmin } from "@/lib/auth/radmin-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDangerState } from "@/lib/security/danger-state";
import { dangerOff } from "@/lib/security/danger-policy";
import { securityRedisUrl } from "@/lib/security/redis-client";

export const dynamic = "force-dynamic";
export default async function DangerPage() {
  await requireRadmin();
  const db = await createSupabaseServerClient({ authScope: "admin" });
  const assurance = await db.auth.mfa.getAuthenticatorAssuranceLevel();
  let state = { ...dangerOff }, available = true;
  try { state = await getDangerState(); } catch { available = false; }
  const configured = Boolean(securityRedisUrl() && (process.env.DANGER_SIGNING_SECRET?.trim().length || 0) >= 32 && process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  return <DangerPanel state={state} available={available} configured={configured} mfaReady={!assurance.error && assurance.data?.currentLevel === "aal2"} />;
}
