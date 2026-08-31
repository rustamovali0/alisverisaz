"use client";

import { Copy, ExternalLink, PauseCircle, PlayCircle } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import { getStorefrontUrl } from "@/lib/config/domains";
import {
  updateStoreManagementAction,
  updateStoreStatusAction,
} from "@/lib/cms/actions";
import { normalizeOrderMethod } from "@/lib/whatsapp-orders/template";

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

function readSetting(settings: Record<string, unknown> | null | undefined, key: string) {
  const value = settings?.[key];

  return typeof value === "string" ? value : "";
}

export function StoreManagementForm({
  store,
  panelSettings,
}: StoreManagementFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const publicUrl = getStorefrontUrl(store.slug);
  const orderMethod = normalizeOrderMethod(store.settings?.orderMethod);
  const whatsappPhone = readSetting(store.settings, "whatsappPhone");

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

  function handleStatusChange(nextStatus: "active" | "suspended") {
    startTransition(async () => {
      const isSuspending = nextStatus === "suspended";
      const confirmed = await appAlert.confirm({
        title: isSuspending ? "Satıcı dondurulsun?" : "Satıcı aktiv edilsin?",
        message: isSuspending
          ? "Təsdiqləsəniz bu satıcının mağazası və məhsulları saytda, axtarışda və siyahılarda görünməyəcək."
          : "Təsdiqləsəniz bu satıcının mağazası və aktiv məhsulları yenidən saytda görünəcək.",
        confirmText: isSuspending ? "Dondur" : "Aktiv et",
        cancelText: "Ləğv et",
        variant: isSuspending ? "danger" : "default",
      });

      if (!confirmed.isConfirmed) {
        return;
      }

      const formData = new FormData();
      formData.set("storeId", store.id);
      formData.set("status", nextStatus);
      const result = await updateStoreStatusAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Status yenilənmədi");
        return;
      }

      void appAlert.success(
        isSuspending ? "Satıcı donduruldu" : "Satıcı aktiv edildi",
        result.message,
      );
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-4">
      <input type="hidden" name="storeId" value={store.id} />
      <div className="rounded-lg border bg-background p-3">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Satıcı görünürlüğü
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Dondurulanda mağaza və məhsullar public hissədə və axtarışda gizlənir.
            </p>
          </div>
          {store.status === "suspended" ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleStatusChange("active")}
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              <PlayCircle className="mr-2 size-4" aria-hidden="true" />
              Aktiv et
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              onClick={() => handleStatusChange("suspended")}
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              <PauseCircle className="mr-2 size-4" aria-hidden="true" />
              Satıcını dondur
            </Button>
          )}
        </div>
      </div>
      <div className="rounded-lg border bg-background p-3">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Public mağaza URL
            </p>
            <code className="mt-1 block min-w-0 truncate text-sm">{publicUrl}</code>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(publicUrl);
                void appAlert.success("Kopyalandı", "Mağaza linki panoya əlavə edildi.");
              }}
            >
              <Copy className="mr-2 size-4" aria-hidden="true" />
              Kopyala
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={publicUrl} target="_blank" rel="noreferrer">
                Aç
                <ExternalLink className="ml-2 size-4" aria-hidden="true" />
              </a>
            </Button>
          </div>
        </div>
      </div>
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
            <option value="draft">Draft</option>
            <option value="active">Aktiv</option>
            <option value="suspended">Dayandırılıb</option>
            <option value="closed">Bağlanıb</option>
          </select>
        </label>
      </div>
      <div className="rounded-lg border bg-background p-3">
        <div>
          <p className="text-sm font-black">Sifariş qəbul etmə üsulu</p>
          <p className="mt-1 text-sm text-muted-foreground">
            WhatsApp seçimi üçün satıcının WhatsApp nömrəsi olmalıdır.
          </p>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm font-semibold">
            <input
              type="radio"
              name="orderMethod"
              value="system"
              defaultChecked={orderMethod === "system"}
              className="size-4"
            />
            Sayt üzərindən
          </label>
          <label className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm font-semibold">
            <input
              type="radio"
              name="orderMethod"
              value="whatsapp"
              defaultChecked={orderMethod === "whatsapp"}
              className="size-4"
            />
            WhatsApp üzərindən
          </label>
        </div>
        <label className="mt-3 grid gap-2 text-sm font-medium">
          WhatsApp nömrəsi
          <PhoneInput name="whatsappPhone" defaultValue={whatsappPhone} />
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
