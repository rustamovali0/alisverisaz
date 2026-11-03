import "server-only";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { getClientIp, readCaptchaToken, verifyFormCaptcha } from "@/lib/auth/security";
import { consumeRateLimit, clearRateLimit } from "./rate-limit";
import { recordAdminAudit } from "@/lib/admin/audit";
import { securityEvent } from "./events";

// A fresh non-persistent client must never replace the administrator's cookie session.
export async function verifyDangerPassword(user: { id: string; email?: string | null }, form: FormData) {
  const ip = await getClientIp();
  const network = await consumeRateLimit("danger_password:ip", ip, 20, 900);
  if (!network.ok) return { ok: false, message: network.message };
  const account = await consumeRateLimit("danger_password:user", user.id, 5, 900);
  if (!account.ok) return { ok: false, message: account.message };
  const password = form.get("adminPassword");
  if (!user.email || typeof password !== "string" || !password || password.length > 1024) return { ok: false, message: "RAdmin giriş şifrənizi yazın." };
  const captcha = await verifyFormCaptcha(form, "login", true);
  if (!captcha.ok) return { ok: false, message: captcha.message };
  const client = createSupabasePublicClient({ requestTimeoutMs: 5000 });
  let temporarySession = false;
  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: user.email,
      password,
      ...(process.env.AUTH_CAPTCHA_MODE === "supabase" ? { options: { captchaToken: readCaptchaToken(form) } } : {}),
    });
    temporarySession = Boolean(data.session);
    if (error || !data.user || data.user.id !== user.id) {
      securityEvent("access_denied", "danger_password", 401);
      await recordAdminAudit({ action: "DANGER_PASSWORD_REJECTED", adminId: user.id, success: false });
      return { ok: false, message: "Admin şifrəsi düzgün deyil və ya təsdiq alınmadı." };
    }
    await clearRateLimit("danger_password:user", user.id);
    return { ok: true, message: "" };
  } catch { return { ok: false, message: "Şifrə təsdiqi alınmadı. Bir az sonra yenidən cəhd edin." }; }
  finally {
    // Only the disposable reauthentication session; never global sign-out.
    if (temporarySession) await client.auth.signOut({ scope: "local" }).catch(() => undefined);
  }
}
