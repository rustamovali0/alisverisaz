"use server";
import { securityEvent } from "./events";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertAuthRateLimit, getClientIp } from "@/lib/auth/security";
import { recordAdminAudit } from "@/lib/admin/audit";
async function client() {
  const current = await getCurrentUserProfile("admin");
  if (!current || current.role !== "admin") {
    securityEvent("access_denied", "admin_mfa", 403);
    throw Error("İcazəniz yoxdur.");
  }
  const rate = await assertAuthRateLimit({
    endpoint: "admin_mfa",
    identifier: current.user.id,
    ip: await getClientIp(),
    maxAttempts: 10,
    windowSeconds: 900,
  });
  if (!rate.ok) throw Error(rate.message);
  return {
    current,
    db: await createSupabaseServerClient({
      authScope: "admin",
      requireCookieWrite: true,
    }),
  };
}
export async function enrollAdminMfa() {
  const { db } = await client();
  const assurance = await db.auth.mfa.getAuthenticatorAssuranceLevel();
  if (
    assurance.error ||
    !assurance.data ||
    (assurance.data.nextLevel === "aal2" &&
      assurance.data.currentLevel !== "aal2")
  )
    throw Error("Əvvəlcə mövcud Authenticator ilə təsdiqləyin.");
  const { data, error } = await db.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "ALISVERIS administrator",
  });
  if (error || !data)
    throw Error("Authenticator qurula bilmədi. Mövcud faktorları yoxlayın.");
  return { id: data.id, qr: data.totp.qr_code };
}
export async function verifyAdminMfa(factorId: string, code: string) {
  if (
    typeof code !== "string" ||
    typeof factorId !== "string" ||
    !/^[0-9]{6}$/.test(code) ||
    factorId.length > 100
  )
    return { ok: false, message: "6 rəqəmli təsdiq kodunu yazın." };
  const { db, current } = await client();
  const { data: factors, error: listError } = await db.auth.mfa.listFactors();
  if (listError || !factors?.totp.some((f) => f.id === factorId))
    return { ok: false, message: "Faktor tapılmadı." };
  const { error } = await db.auth.mfa.challengeAndVerify({ factorId, code });
  await recordAdminAudit({
    action: "ADMIN_MFA_VERIFY",
    adminId: current.user.id,
    success: !error,
  });
  return error
    ? { ok: false, message: "Kod uyğun gəlmir və ya vaxtı bitib." }
    : { ok: true, message: "Təsdiqləndi." };
}
