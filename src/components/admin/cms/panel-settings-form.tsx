"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { updatePanelSettingsAction } from "@/lib/cms/actions";
import type { PanelFeatureSettings } from "@/lib/cms/types";
import { appAlert } from "@/lib/alerts/swal";

type PanelSettingsFormProps = {
  kind: "store" | "user";
  settings: PanelFeatureSettings;
};

export function PanelSettingsForm({ kind, settings }: PanelSettingsFormProps) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updatePanelSettingsAction(formData);

      if (!result.ok) {
        await appAlert.error(result.message, "Panel ayarı saxlanmadı");
        return;
      }

      await appAlert.success("Panel ayarı saxlandı", result.message);
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-4">
      <input type="hidden" name="kind" value={kind} />
      <label className="grid gap-2 text-sm font-medium">
        Panel adı
        <input
          name="title"
          defaultValue={settings.title}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Feature flags JSON
        <textarea
          name="features"
          defaultValue={JSON.stringify(settings.features, null, 2)}
          className="min-h-44 rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Sidebar items JSON
        <textarea
          name="sidebarItems"
          defaultValue={JSON.stringify(settings.sidebarItems, null, 2)}
          className="min-h-44 rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Görünüş və mətn ayarları JSON
        <textarea
          name="settings"
          defaultValue={JSON.stringify(settings.settings, null, 2)}
          className="min-h-32 rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <Button type="submit" className="w-fit" disabled={isPending}>
        Saxla
      </Button>
    </form>
  );
}
