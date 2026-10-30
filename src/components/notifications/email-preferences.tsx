"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { saveEmailPreferences } from "@/lib/email/preferences";

export function EmailPreferences(
  { initial }: {
    initial: { available: boolean; transactional: boolean; marketing: boolean };
  },
) {
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState("");
  const [transactional,setTransactional]=useState(initial.transactional);
  const [marketing,setMarketing]=useState(initial.marketing);
  return (
    <section id="email-preferences" className="scroll-mt-28 rounded-xl border bg-card p-4 sm:p-5">
      <h2 className="text-lg font-bold">E-poçt bildirişləri</h2>
      {!initial.available
        ? (
          <p className="mt-3 text-sm text-muted-foreground">
            E-poçt bildirişləri hazırlanır. Göndəriş bağlantısı qurulduqdan
            sonra ayarlar aktiv olacaq.
          </p>
        )
        : (
          <form
            className="mt-3 grid gap-3"
            action={(data) =>
              start(async () => {
                try {
                  data.set("transactional",transactional?"on":"off");
                  data.set("marketing",marketing?"on":"off");
                  setFeedback((await saveEmailPreferences(data)).message);
                } catch {
                  setFeedback("Bağlantı xətası. Yenidən cəhd edin.");
                }
              })}
          >
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                className="size-5 shrink-0 accent-emerald-700"
                type="checkbox"
                name="transactional"
                checked={transactional}
                onChange={event=>setTransactional(event.target.checked)}
              />
              <span>Sifariş, mesaj və mağaza bildirişləri</span>
            </label>
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                className="size-5 shrink-0 accent-emerald-700"
                type="checkbox"
                name="marketing"
                checked={marketing}
                onChange={event=>setMarketing(event.target.checked)}
              />
              <span>Kampaniya və endirim e-poçtları</span>
            </label>
            <p className="text-sm text-muted-foreground">
              Şifrə bərpası və hesab təhlükəsizliyi e-poçtları bu seçimdən asılı
              deyil.
            </p>
            <p role="status" className="text-sm">{feedback}</p>
            <Button
              type="submit"
              disabled={pending}
              className="min-h-11 justify-self-start"
            >
              {pending ? "Saxlanılır…" : "E-poçt ayarlarını saxla"}
            </Button>
          </form>
        )}
    </section>
  );
}
