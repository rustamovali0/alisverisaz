"use client";
import { useEffect, useRef, useState } from "react";
export function VisitReturn() {
  const started = useRef(false), [error, setError] = useState("");
  useEffect(() => {
    if (started.current) return; started.current = true;
    const proof = window.location.hash.slice(1);
    window.history.replaceState(null, "", "/security-return");
    if (!proof || proof.length > 6000) { setError("Qayıdış keçidi düzgün deyil. Mağazanı yenidən açın."); return; }
    fetch("/api/security/return", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proof }), signal: AbortSignal.timeout(10000) }).then(async response => {
      const data = await response.json(); if (!response.ok || !data.ok) throw Error("Yoxlama müddəti bitib. Mağazanı yenidən açın."); window.location.replace(data.next);
    }).catch(() => setError("Mağazaya qayıdış alınmadı. Aşağıdakı keçidi açıb yenidən cəhd edin."));
  }, []);
  return <main className="grid min-h-dvh place-items-center bg-slate-50 p-6 dark:bg-slate-950"><section className="max-w-md rounded-2xl border bg-card p-7"><h1 className="text-xl font-bold">Mağazaya qayıdış</h1><p className="mt-3 text-sm leading-6" role={error ? "alert" : "status"}>{error || "Yoxlama təsdiqlənir…"}</p>{error && <a href="/" className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-[#17634b] px-5 font-semibold text-white">Mağazanı yenidən aç</a>}</section></main>;
}
