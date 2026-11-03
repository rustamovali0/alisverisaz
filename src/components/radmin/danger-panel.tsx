"use client";
import { useActionState, useState } from "react";
import { AlertTriangle, ShieldCheck, Clock3, LockKeyhole, Bot, CheckCircle2 } from "lucide-react";
import { updateDangerMode } from "@/lib/security/danger-actions";
import type { DangerState } from "@/lib/security/danger-policy";

export function DangerPanel({ state, mfaReady, configured, available }: { state: DangerState; mfaReady: boolean; configured: boolean; available: boolean }) {
  const [result, action, pending] = useActionState(updateDangerMode, { ok: false, message: "" });
  const [confirmed, setConfirmed] = useState(false);
  const features = [
    { icon: Bot, title: "Hər yeni açılışda yoxlama", description: "Sayta daxil olanda və səhifəni yeniləyəndə Cloudflare Turnstile yoxlaması göstərilir." },
    { icon: LockKeyhole, title: "Daha sərt giriş limitləri", description: "Giriş, qeydiyyat, şifrə bərpası və axtarışda sorğu limitləri aşağı salınır." },
    { icon: Clock3, title: "Avtomatik normal rejim", description: "Seçilmiş müddət bitəndə əlavə məhdudiyyətlər avtomatik götürülür. Əsas qoruma qalır." },
  ];
  return <div className="mx-auto w-full max-w-5xl space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-red-600">Təhlükəsizlik idarəetməsi</p><h1 className="text-3xl font-bold tracking-tight">Danger</h1><p className="mt-2 max-w-2xl text-base leading-7 text-muted-foreground">Şübhəli trafik artanda əlavə yoxlamaları müvəqqəti aktivləşdirin.</p></div>
      <span className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold ${state.enabled ? "border-red-200 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200" : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"}`}><span className={`size-2 rounded-full ${state.enabled ? "bg-red-500" : "bg-emerald-500"}`} />{state.enabled ? "Danger aktivdir" : "Normal qoruma"}</span>
    </header>
    <div className="grid gap-4 md:grid-cols-3">{features.map(({ icon: Icon, title, description }) => <section key={title} className="rounded-2xl border bg-card p-5"><Icon className="mb-4 size-6 text-red-600" aria-hidden="true" /><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p></section>)}</div>
    <section className="overflow-hidden rounded-2xl border bg-card">
      <div className="border-b bg-muted/30 p-5 sm:p-6"><h2 className="text-xl font-semibold">{state.enabled ? "Əlavə qoruma aktivdir" : "Əlavə qorumanı aktivləşdir"}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{state.enabled ? `Bitmə vaxtı: ${new Intl.DateTimeFormat("az-AZ", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Baku" }).format(state.expiresAt)} (Bakı vaxtı)` : "Normal qoruma həmişə işləyir. Danger əlavə yoxlamalar və daha sərt limitlər tətbiq edir."}</p></div>
      <div className="space-y-5 p-5 sm:p-6">
        {!available && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">Təhlükəsizlik yaddaşı əlçatan deyil. Dəyişiklik etmək mümkün deyil.</p>}
        {!configured && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Rejimi aktivləşdirmək üçün serverdə təhlükəsizlik açarları sazlanmalıdır.</p>}
        {!mfaReady && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><p className="font-semibold">İki mərhələli təsdiq tələb olunur</p><p>Bu vacib ayarı dəyişmək üçün Authenticator ilə təsdiqləyin.</p><a href="/radmin/mfa" className="mt-2 inline-flex min-h-11 items-center font-semibold underline underline-offset-4">Təsdiq səhifəsinə keç →</a></div>}
        <form action={action} className="space-y-5">
          <input type="hidden" name="version" value={state.version} /><input type="hidden" name="enabled" value={String(!state.enabled)} />
          {!state.enabled && <div className="max-w-sm"><label htmlFor="danger-duration" className="mb-2 block text-sm font-medium">Rejim nə qədər aktiv qalsın?</label><select id="danger-duration" name="seconds" defaultValue="3600" className="min-h-12 w-full rounded-xl border bg-background px-3 text-base"><option value="900">15 dəqiqə</option><option value="3600">1 saat</option><option value="21600">6 saat</option></select></div>}
          {state.enabled && <input type="hidden" name="seconds" value="0" />}
          <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-4"><input type="checkbox" name="confirm" value="yes" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} className="mt-0.5 size-5 shrink-0 accent-red-600" /><span className="text-sm leading-6">{state.enabled ? "Əlavə rejimi söndürüb normal qorumanı saxlamaq istəyirəm." : "Əlavə yoxlamaların istifadəçilərə də göstəriləcəyini anlayıram və aktivləşdirməni təsdiqləyirəm."}</span></label>
          <button disabled={pending || !confirmed || !mfaReady || (!state.enabled && !configured) || !available} className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-6 font-semibold text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${state.enabled ? "bg-[#17634b] hover:bg-[#124d3a] focus-visible:outline-emerald-600" : "bg-red-600 hover:bg-red-700 focus-visible:outline-red-600"}`}><ShieldCheck className="size-5" aria-hidden="true" />{pending ? "Saxlanılır…" : state.enabled ? "Normal rejimə qayıt" : "Danger rejimini aktivləşdir"}</button>
          {result.message && <p role={result.ok ? "status" : "alert"} className={`rounded-xl p-4 text-sm ${result.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}>{result.ok && <CheckCircle2 className="mr-2 inline size-4" aria-hidden="true" />}{result.message}</p>}
        </form>
      </div>
    </section>
    <aside className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950"><AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><div className="text-sm leading-6"><p className="font-semibold">Əlavə tətbiq qoruması</p><p>Turnstile yoxlaması və sərt limitlər serverdə işləyir. Cloudflare-in ayrıca WAF/DDoS və serverə birbaşa giriş qaydaları bu düymə ilə dəyişmir. Cloudflare yoxlamanı bəzən avtomatik tamamlayır.</p></div></aside>
  </div>;
}
