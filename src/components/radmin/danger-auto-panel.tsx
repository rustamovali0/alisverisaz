"use client";
import { DangerPasswordFields } from "./danger-password-fields";
import { useActionState, useState } from "react";
import { ShieldAlert, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { updateDangerAuto } from "@/lib/security/danger-actions";
import type { DangerAutoStatus } from "@/lib/security/danger-auto";
const date = (value: number) => new Intl.DateTimeFormat("az-AZ", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Baku" }).format(value);
export function DangerAutoPanel({ settings, siteKey, captchaRequired, configured, available }: { settings: DangerAutoStatus; siteKey: string; captchaRequired: boolean; configured: boolean; available: boolean }) {
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [result, action, pending] = useActionState(async (previous: { ok: boolean; message: string }, form: FormData) => {
    try { return await updateDangerAuto(previous, form); }
    finally { setPassword(""); setCaptchaToken(""); }
  }, { ok: false, message: "" });
  const [confirmed, setConfirmed] = useState(false);
  const router = useRouter();
  return <section className="overflow-hidden rounded-2xl border bg-card" aria-labelledby="danger-auto-title">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 p-5 sm:p-6">
      <div className="flex items-center gap-3"><ShieldAlert className="size-6 text-amber-600 dark:text-amber-400" aria-hidden="true" /><h2 id="danger-auto-title" className="text-xl font-semibold">Risk zamanı avtomatik aktivləşmə</h2></div>
      <span className="rounded-full border px-3 py-1 text-sm font-semibold">{settings.enabled ? "İzləmə açıqdır" : "İzləmə bağlıdır"}</span>
    </div>
    <div className="space-y-5 p-5 sm:p-6">
      <p className="text-sm leading-6 text-muted-foreground">Açıq olduqda sistem son 5 dəqiqədə təhlükəli giriş davranışını izləyir. Aşağıdakı hədlərdən biri keçiləndə Danger 15 dəqiqəlik aktivləşir.</p>
      <ul className="list-disc space-y-2 pl-5 text-sm leading-6"><li>Ən az 5 fərqli şəbəkədən 30 uğursuz giriş cəhdi.</li><li>Ən az 3 fərqli şəbəkədən giriş, qeydiyyat və şifrə bərpası limitlərinin 60 dəfə aşılması.</li></ul>
      <p className="rounded-xl bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">Adi baxışlar və uğurlu girişlər risk sayılmır. Rejim ardıcıl uzadılmır. Təkrar aktivləşmə üçün 30 dəqiqəlik fasilə var; Danger-i əl ilə söndürəndə də bu fasilə tətbiq olunur.</p>
      {settings.lastTriggeredAt > 0 && <p className="text-sm leading-6"><strong>Son avtomatik aktivləşmə:</strong> {date(settings.lastTriggeredAt)} — {settings.lastReason === "login_failed" ? "uğursuz girişlər artıb" : "giriş təhlükəsizlik limitləri aşılıb"}.</p>}
      {settings.cooldownUntil > Date.now() && settings.enabled && <p className="text-sm text-muted-foreground">Avtomatik aktivləşmə {date(settings.cooldownUntil)} tarixinədək fasilədədir.</p>}
      <form action={action} className="space-y-4">
        <input type="hidden" name="enabled" value={String(!settings.enabled)} /><input type="hidden" name="version" value={settings.version} />
        <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-4"><input type="checkbox" name="confirm" value="yes" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[#17634b]" /><span className="text-sm leading-6">{settings.enabled ? "Avtomatik risk izləməsini söndürməyi təsdiqləyirəm." : "Risk həddi keçiləndə bütün istifadəçilərə əlavə yoxlama göstərilməsini təsdiqləyirəm."}</span></label>
        <DangerPasswordFields password={password} onPassword={setPassword} token={captchaToken} onToken={setCaptchaToken} siteKey={siteKey} />
        <div className="flex flex-wrap gap-3"><button disabled={pending || !confirmed || !password || (captchaRequired && !captchaToken) || !available || (!settings.enabled && !configured)} className="min-h-12 w-full rounded-xl bg-[#17634b] px-5 font-semibold text-white transition hover:bg-[#124d3a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">{pending ? "Saxlanılır…" : settings.enabled ? "Avtomatik rejimi söndür" : "Avtomatik rejimi aç"}</button><button type="button" onClick={() => router.refresh()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold hover:bg-muted focus-visible:outline focus-visible:outline-2"><RefreshCw className="size-4" aria-hidden="true" />Vəziyyəti yenilə</button></div>
        {result.message && <p role={result.ok ? "status" : "alert"} className="rounded-xl border p-3 text-sm leading-6">{result.message}</p>}
      </form>
    </div>
  </section>;
}
