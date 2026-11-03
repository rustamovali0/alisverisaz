import { DangerPanel } from "@/components/radmin/danger-panel";
import { requireRadmin } from "@/lib/auth/radmin-auth";
import { serverEnv } from "@/lib/config/env.server";
import { getDangerState } from "@/lib/security/danger-state";
import { dangerOff } from "@/lib/security/danger-policy";
import { dangerConfigured, dangerAutoOff, getDangerAutoStatus } from "@/lib/security/danger-auto";

export const dynamic = "force-dynamic";
export default async function DangerPage() {
  await requireRadmin();
  let state = { ...dangerOff }, automatic = { ...dangerAutoOff }, available = true;
  try { [state, automatic] = await Promise.all([getDangerState(), getDangerAutoStatus()]); } catch { available = false; }
  const configured = dangerConfigured();
  return <DangerPanel automatic={automatic} state={state} available={available} configured={configured} siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""} captchaRequired={serverEnv.hasTurnstileConfig} />;
}
