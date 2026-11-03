"use server";
import { revalidatePath } from "next/cache";
import { requireRadmin } from "@/lib/auth/radmin-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordAdminAudit } from "@/lib/admin/audit";
import { consumeRateLimit } from "./rate-limit";
import { changeDangerState } from "./danger-state";
import { cookies, headers } from "next/headers";
import { resolveClientIp } from "./client-ip";
import { dangerCookieNames, issueDangerProofs } from "./danger-proofs";

export type DangerActionState = { ok: boolean; message: string };
export async function updateDangerMode(_previous: DangerActionState, form: FormData): Promise<DangerActionState> {
  const current = await requireRadmin();
  try {
    const client = await createSupabaseServerClient({ authScope: "admin" });
    const assurance = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance.error || assurance.data?.currentLevel !== "aal2") return { ok: false, message: "Əvvəlcə iki mərhələli təsdiqi tamamlayın." };
    const rate = await consumeRateLimit("admin-danger-change", current.user.id, 5, 60);
    if (!rate.ok) return { ok: false, message: rate.message };
    const enabled = form.get("enabled") === "true";
    if (!["true", "false"].includes(String(form.get("enabled"))) || form.get("confirm") !== "yes") return { ok: false, message: "Dəyişikliyi təsdiqləyin." };
    const state = await changeDangerState(enabled, Number(form.get("seconds")), String(form.get("version") || ""));
    // The AAL2 operator can still turn the mode off from the current page.
    // No entry ticket is granted: a subsequent full navigation is challenged.
    try {
      const h = await headers(), jar = await cookies(), names = dangerCookieNames();
      const options = { path: "/", httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const };
      if (enabled) {
        const proof = issueDangerProofs(state, { host: (h.get("host") || "").toLowerCase(), ip: resolveClientIp(h), userAgent: (h.get("user-agent") || "").slice(0, 1000) }, "/radmin/danger");
        jar.set(names.clearance, proof.clearance, { ...options, maxAge: Math.min(3600, Math.ceil((state.expiresAt - Date.now()) / 1000)) });
      } else {
        jar.set(names.clearance, "", { ...options, maxAge: 0 });
        jar.set(names.entry, "", { ...options, maxAge: 0 });
      }
    } catch { /* A fresh visit can recover the operator's clearance. */ }
    await recordAdminAudit({ action: enabled ? "DANGER_ENABLED" : "DANGER_DISABLED", adminId: current.user.id, metadata: { expiresAt: state.expiresAt, version: state.version } });
    revalidatePath("/radmin/danger");
    return { ok: true, message: enabled ? "Danger rejimi aktivləşdirildi." : "Normal qoruma rejiminə qayıdıldı." };
  } catch (error) {
    const allowed = ["Müddət düzgün deyil.", "Səhifəni yeniləyin.", "Təhlükəsizlik açarları sazlanmayıb.", "Ayar başqa sessiyada dəyişib. Səhifəni yeniləyin."];
    return { ok: false, message: error instanceof Error && allowed.includes(error.message) ? error.message : "Dəyişiklik saxlanılmadı. Təhlükəsizlik xidmətini yoxlayın." };
  }
}

export async function updateDangerAuto(_previous: DangerActionState, form: FormData): Promise<DangerActionState> {
  const current = await requireRadmin();
  try {
    const client = await createSupabaseServerClient({ authScope: "admin" });
    const assurance = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance.error || assurance.data?.currentLevel !== "aal2") return { ok: false, message: "Əvvəlcə iki mərhələli təsdiqi tamamlayın." };
    const rate = await consumeRateLimit("admin-danger-change", current.user.id, 5, 60);
    if (!rate.ok) return { ok: false, message: rate.message };
    if (!["true", "false"].includes(String(form.get("enabled"))) || form.get("confirm") !== "yes") return { ok: false, message: "Dəyişikliyi təsdiqləyin." };
    const { changeDangerAuto } = await import("./danger-auto");
    const enabled = form.get("enabled") === "true";
    const config = await changeDangerAuto(enabled, String(form.get("version") || ""));
    await recordAdminAudit({ action: enabled ? "DANGER_AUTO_ENABLED" : "DANGER_AUTO_DISABLED", adminId: current.user.id, metadata: { version: config.version } });
    revalidatePath("/radmin/danger");
    return { ok: true, message: enabled ? "Risk zamanı avtomatik qoruma açıldı." : "Avtomatik izləmə söndürüldü. Aktiv Danger rejimini ayrıca söndürə bilərsiniz." };
  } catch (error) {
    const allowed = ["Səhifəni yeniləyin.", "Təhlükəsizlik açarları sazlanmayıb.", "Ayar başqa sessiyada dəyişib. Səhifəni yeniləyin."];
    return { ok: false, message: error instanceof Error && allowed.includes(error.message) ? error.message : "Avtomatik qoruma ayarı saxlanılmadı." };
  }
}
