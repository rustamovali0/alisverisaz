"use client";

import { ImagePlus, Loader2 } from "lucide-react";
import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/app-alert";
import { updateSellerStoreSettingsAction } from "@/lib/store-settings/actions";

type StoreBrandingQuickEditProps = {
  store: {
    id: string;
    name: string;
    logoUrl: string | null;
    coverUrl: string | null;
  };
};

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

export function StoreBrandingQuickEdit({ store }: StoreBrandingQuickEditProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  function replaceImage(kind: "logo" | "banner", file: File | null) {
    if (!file || isPending) return;

    const formData = new FormData();
    formData.set("storeId", store.id);
    formData.set("name", store.name);
    formData.set(kind, file);

    startTransition(async () => {
      const result = await updateSellerStoreSettingsAction(formData);
      if (!result.ok) {
        void appAlert.error(result.message, "Şəkil yenilənmədi");
        return;
      }

      void appAlert.success("Şəkil yeniləndi", result.message);
      router.refresh();
    });
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm">
      <input ref={bannerInputRef} type="file" accept={IMAGE_ACCEPT} className="sr-only" onChange={(event) => replaceImage("banner", event.target.files?.[0] ?? null)} />
      <input ref={logoInputRef} type="file" accept={IMAGE_ACCEPT} className="sr-only" onChange={(event) => replaceImage("logo", event.target.files?.[0] ?? null)} />
      <button type="button" onClick={() => bannerInputRef.current?.click()} disabled={isPending} className="group relative block h-28 w-full overflow-hidden bg-primary/10 text-left disabled:cursor-wait sm:h-48 lg:h-56" aria-label="Banneri dəyiş">
        {store.coverUrl ? <img src={store.coverUrl} alt="" className="h-full w-full object-cover" /> : <span className="absolute inset-0 bg-[linear-gradient(135deg,hsl(var(--primary)/0.22),hsl(var(--accent)/0.16))]" />}
        <span className="absolute inset-0 grid place-items-center bg-black/0 transition group-hover:bg-black/25 group-focus-visible:bg-black/25">
          <span className="inline-flex items-center gap-2 rounded-lg bg-background/95 px-3 py-2 text-sm font-semibold text-foreground opacity-0 shadow-sm transition group-hover:opacity-100 group-focus-visible:opacity-100">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            Banneri dəyiş
          </span>
        </span>
      </button>
      <div className="relative flex min-w-0 items-end gap-3 px-3 pb-4 pt-9 sm:px-6 sm:pb-6">
        <Button type="button" variant="outline" size="icon" onClick={() => logoInputRef.current?.click()} disabled={isPending} className="absolute -top-8 left-3 size-16 overflow-hidden rounded-xl bg-background p-0 shadow-sm sm:-top-11 sm:left-6 sm:size-20" aria-label="Logonu dəyiş">
          {store.logoUrl ? <img src={store.logoUrl} alt="" className="h-full w-full object-cover" /> : <span className="text-2xl font-black text-primary">{store.name.slice(0, 1)}</span>}
          <span className="absolute inset-0 grid place-items-center bg-black/45 text-white opacity-0 transition hover:opacity-100 focus-within:opacity-100"><ImagePlus className="size-5" /></span>
        </Button>
        <div className="min-w-0"><h1 className="truncate text-2xl font-black tracking-normal sm:text-3xl">{store.name}</h1><p className="mt-1 text-sm text-muted-foreground">Banner və logoya toxunaraq yeniləyin.</p></div>
      </div>
    </section>
  );
}
