"use client";

import { ExternalLink, Globe2, PauseCircle, PlayCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/app-alert";
import { updateStorefrontAccessAction } from "@/lib/cms/actions";
import { getStorefrontUrl, getStorePath } from "@/lib/config/domains";

type StorefrontAccessRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  ownerLabel: string;
  customStorefrontEnabled: boolean;
};

type StorefrontAccessManagerProps = {
  stores: StorefrontAccessRow[];
};

export function StorefrontAccessManager({ stores }: StorefrontAccessManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function updateAccess(store: StorefrontAccessRow, enabled: boolean) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("storeId", store.id);
      formData.set("slug", store.slug);

      if (enabled) {
        formData.set("customStorefrontEnabled", "on");
      }

      const result = await updateStorefrontAccessAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Subdomain ayarı saxlanmadı");
        return;
      }

      void appAlert.success("Subdomain ayarı saxlandı", result.message);
      router.refresh();
    });
  }

  function saveStorefront(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updateStorefrontAccessAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Subdomain ayarı saxlanmadı");
        return;
      }

      void appAlert.success("Subdomain ayarı saxlandı", result.message);
      router.refresh();
    });
  }

  if (stores.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-background p-8 text-center">
        <Globe2 className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
        <p className="mt-3 text-lg font-black">Mağaza tapılmadı</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Subdomain idarəsi üçün əvvəlcə mağaza yaradılmalıdır.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {stores.map((store) => {
        const publicUrl = store.customStorefrontEnabled
          ? getStorefrontUrl(store.slug)
          : getStorePath(store.slug);

        return (
          <form
            key={store.id}
            onSubmit={saveStorefront}
            className="grid gap-3 rounded-xl border bg-background p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
          >
            <input type="hidden" name="storeId" value={store.id} />
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h2 className="min-w-0 truncate text-lg font-black">{store.name}</h2>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  {store.status}
                </span>
                <span
                  className={
                    store.customStorefrontEnabled
                      ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                      : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300"
                  }
                >
                  {store.customStorefrontEnabled ? "Subdomain aktiv" : "Yalnız /store aktiv"}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground">{store.ownerLabel}</p>
              <label className="mt-3 block text-xs font-black uppercase tracking-wide text-muted-foreground">
                Subdomain və /mağaza adı
              </label>
              <input
                name="slug"
                defaultValue={store.slug}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="mt-1 h-11 w-full rounded-lg border bg-background px-3 font-mono text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="magaza-adi"
              />
              <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <input
                  type="checkbox"
                  name="customStorefrontEnabled"
                  defaultChecked={store.customStorefrontEnabled}
                  className="size-4 rounded border"
                />
                Subdomain və qısa /mağaza yolu aktiv olsun
              </label>
              <div className="mt-3 grid gap-1.5 text-sm">
                <code className="min-w-0 truncate rounded-md bg-muted px-2 py-1">
                  /{store.slug}
                </code>
                <code className="min-w-0 truncate rounded-md bg-muted px-2 py-1">
                  {store.slug}.alisveris.az
                </code>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
              <Button type="submit" variant="secondary" size="sm" disabled={isPending}>
                <Save className="mr-2 size-4" aria-hidden="true" />
                Saxla
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={publicUrl} target="_blank" rel="noreferrer">
                  Aç
                  <ExternalLink className="ml-2 size-4" aria-hidden="true" />
                </a>
              </Button>
              {store.customStorefrontEnabled ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={isPending}
                  onClick={() => updateAccess(store, false)}
                >
                  <PauseCircle className="mr-2 size-4" aria-hidden="true" />
                  Deaktiv et
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending}
                  onClick={() => updateAccess(store, true)}
                >
                  <PlayCircle className="mr-2 size-4" aria-hidden="true" />
                  Aktiv et
                </Button>
              )}
            </div>
          </form>
        );
      })}
    </div>
  );
}
