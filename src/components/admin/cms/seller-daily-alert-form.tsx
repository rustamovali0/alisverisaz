"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/app-alert";
import { updateSellerDailyAlertAction } from "@/lib/seller-alerts/actions";
import type { SellerDailyAlertConfig } from "@/lib/seller-alerts/data";

export function SellerDailyAlertForm({ config }: { config: SellerDailyAlertConfig }) {
  const [isPending, startTransition] = useTransition();
  const [audience, setAudience] = useState(config.audience);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateSellerDailyAlertAction(formData);
      if (!result.ok) {
        void appAlert.error(result.message, "Alert saxlanmadı");
        return;
      }
      void appAlert.success("Alert yeniləndi", result.message);
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-4 rounded-md border bg-card p-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium">
          Başlıq
          <input name="title" defaultValue={config.title} maxLength={120} required className="h-10 rounded-md border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Auditoriya
          <select
            name="audience"
            value={audience}
            onChange={(event) => setAudience(event.target.value as SellerDailyAlertConfig["audience"])}
            className="h-10 rounded-md border border-input bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all_sellers">Bütün satıcılar</option>
            <option value="missing_assets">Logo və ya banneri çatışmayanlar</option>
          </select>
        </label>
      </div>
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
        <span className="font-bold">Göndərilənlər: </span>
        {audience === "all_sellers"
          ? "Bütün satıcı hesabları"
          : "Logo və ya banneri çatışmayan mağaza sahibləri"}
      </div>
      <label className="grid gap-1.5 text-sm font-medium">
        Mətn
        <textarea name="body" defaultValue={config.body} maxLength={500} required className="min-h-24 rounded-md border border-input bg-background px-3 py-2 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-1.5 text-sm font-medium">
          Başlama saatı
          <input name="startTime" type="time" defaultValue={config.startTime} required className="h-10 rounded-md border border-input bg-background px-3 font-normal" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Bitmə saatı
          <input name="endTime" type="time" defaultValue={config.endTime} required className="h-10 rounded-md border border-input bg-background px-3 font-normal" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Düymənin adı
          <input name="ctaLabel" defaultValue={config.ctaLabel} maxLength={60} required className="h-10 rounded-md border border-input bg-background px-3 font-normal" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input name="enabled" type="checkbox" defaultChecked={config.enabled} className="size-4 rounded border-input" />
          Aktiv
        </label>
        <span className="text-xs text-muted-foreground">Hər satıcıya Bakı vaxtı ilə seçilən saatlarda gündə bir dəfə göstərilir.</span>
      </div>
      <Button type="submit" className="w-fit" disabled={isPending}>
        {isPending ? "Saxlanılır..." : "Gündəlik alerti saxla"}
      </Button>
    </form>
  );
}
