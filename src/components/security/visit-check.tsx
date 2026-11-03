"use client";
import { useState } from "react";
import { ShieldCheck, LoaderCircle, ArrowRight } from "lucide-react";
import { TurnstileField } from "@/components/auth/turnstile-field";

export function VisitCheck({ next, siteKey, transfer = "" }: { next: string; siteKey: string; transfer?: string }) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!token || busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/security/visit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, next, transfer }), signal: AbortSignal.timeout(10000) });
      const data = await response.json();
      if (!response.ok || data.ok !== true) throw Error(data.message || "Yoxlama alınmadı. Yenidən cəhd edin.");
      window.location.replace(data.transfer ? `https://${data.transfer.host}/security-return#${encodeURIComponent(data.transfer.proof)}` : data.next);
    } catch (e) { setError(e instanceof Error ? e.message : "Yoxlama alınmadı."); setToken(""); setBusy(false); }
  }
  return <main className="grid min-h-dvh place-items-center bg-slate-50 px-4 py-8 dark:bg-slate-950">
    <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9 dark:border-slate-800 dark:bg-slate-900" aria-labelledby="visit-title">
      <a href="/" className="mb-8 inline-flex items-center gap-2 text-xl font-black tracking-tight"><img src="/brand/email-logo.png" alt="" className="size-9 object-contain" />ALİSVERİS.AZ</a>
      <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950"><ShieldCheck className="size-7" aria-hidden="true" /></div>
      <h1 id="visit-title" className="text-2xl font-bold tracking-tight">Təhlükəsizlik yoxlaması</h1>
      <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">Saytı avtomatik hücumlardan qorumaq üçün girişinizi yoxlayırıq. Yoxlamanı tamamlayıb davam edin.</p>
      <form onSubmit={submit} className="mt-6 space-y-5">
        <TurnstileField action="danger_visit" appearance="always" siteKey={siteKey} token={token} onTokenChange={setToken} />
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{error}</p>}
        <button type="submit" disabled={!token || busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#17634b] px-4 font-semibold text-white transition hover:bg-[#124d3a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ArrowRight className="size-5" aria-hidden="true" />} {busy ? "Yoxlanılır…" : "Sayta davam et"}
        </button>
      </form>
      <p className="mt-6 border-t pt-4 text-xs leading-5 text-slate-500 dark:border-slate-800">Yoxlama Cloudflare Turnstile ilə aparılır. JavaScript və cookie-lər aktiv olmalıdır.</p>
    </section>
  </main>;
}
