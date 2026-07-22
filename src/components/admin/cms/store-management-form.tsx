"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/app-alert";
import { updateStoreManagementAction } from "@/lib/cms/actions";

type StoreManagementFormProps = {
  store: {
    id: string;
    name: string;
    slug: string;
    status: string;
    settings?: Record<string, unknown> | null;
  };
  panelSettings?: {
    title?: string | null;
    features?: Record<string, unknown> | null;
    sidebar_items?: unknown[] | null;
    settings?: Record<string, unknown> | null;
  } | null;
};

export function StoreManagementForm({
  store,
  panelSettings,
}: StoreManagementFormProps) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateStoreManagementAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Mağaza ayarı saxlanmadı");
        return;
      }

      void appAlert.success("Mağaza ayarı saxlandı", result.message);
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-4">
      <input type="hidden" name="storeId" value={store.id} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Mağaza adı
          <input
            value={store.name}
            readOnly
            className="h-10 rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Status
          <select
            name="status"
            defaultValue={store.status}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="active">Aktiv</option>
            <option value="pending">Gözləyir</option>
            <option value="suspended">Dayandırılıb</option>
            <option value="archived">Arxiv</option>
          </select>
        </label>
      </div>
      <label className="grid gap-2 text-sm font-medium">
        Store settings JSON
        <textarea
          name="storeSettings"
          defaultValue={JSON.stringify(store.settings ?? {}, null, 2)}
          className="min-h-32 rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Panel adı
        <input
          name="panelTitle"
          defaultValue={panelSettings?.title ?? "Mağaza paneli"}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Feature flags JSON
        <textarea
          name="features"
          defaultValue={JSON.stringify(panelSettings?.features ?? {}, null, 2)}
          className="min-h-40 rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Sidebar items JSON
        <textarea
          name="sidebarItems"
          defaultValue={JSON.stringify(panelSettings?.sidebar_items ?? [], null, 2)}
          className="min-h-40 rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Panel settings JSON
        <textarea
          name="panelSettings"
          defaultValue={JSON.stringify(panelSettings?.settings ?? {}, null, 2)}
          className="min-h-32 rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <Button type="submit" className="w-fit" disabled={isPending}>
        Saxla
      </Button>
    </form>
  );
}
