"use client";

import { ImagePlus, Loader2, Save } from "lucide-react";
import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/app-alert";
import { updateSellerStoreSettingsAction } from "@/lib/store-settings/actions";

type StoreBrandingQuickEditProps = {
  store: {
    id: string;
    name: string;
    heroTitle?: string | null;
    heroSubtitle?: string | null;
    socialInstagram?: string | null;
    socialTiktok?: string | null;
    logoUrl: string | null;
    coverUrl: string | null;
  };
};

const IMAGE_ACCEPT = "image/*,.heic,.heif,.avif,.tif,.tiff,.bmp";
const DEFAULT_MARKETPLACE_BANNER_URL = "/auth/auth-banner.png";

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
      const input = kind === "logo" ? logoInputRef.current : bannerInputRef.current;

      if (input) {
        input.value = "";
      }

      if (!result.ok) {
        void appAlert.error(result.message, "Şəkil yenilənmədi");
        return;
      }

      void appAlert.success("Şəkil yeniləndi", result.message);
      router.refresh();
    });
  }

  function updateTitle(formData: FormData) {
    if (isPending) return;

    formData.set("storeId", store.id);
    formData.set("name", store.name);

    startTransition(async () => {
      const result = await updateSellerStoreSettingsAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Title saxlanmadı");
        return;
      }

      void appAlert.success("Title yeniləndi", result.message);
      router.refresh();
    });
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-lg bg-card shadow-sm">
      <input ref={bannerInputRef} type="file" accept={IMAGE_ACCEPT} className="sr-only" onChange={(event) => replaceImage("banner", event.target.files?.[0] ?? null)} />
      <input ref={logoInputRef} type="file" accept={IMAGE_ACCEPT} className="sr-only" onChange={(event) => replaceImage("logo", event.target.files?.[0] ?? null)} />
      <button type="button" onClick={() => bannerInputRef.current?.click()} disabled={isPending} className="group relative block min-h-[270px] w-full overflow-hidden bg-primary/10 text-left disabled:cursor-wait sm:min-h-[360px] lg:min-h-[390px]" aria-label="Banneri dəyiş">
        <img src={store.coverUrl || DEFAULT_MARKETPLACE_BANNER_URL} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <span className="absolute inset-0 bg-slate-950/45" aria-hidden="true" />
        <span className="absolute inset-0 grid place-items-center bg-black/0 transition group-hover:bg-black/15 group-focus-visible:bg-black/15">
          <span className="inline-flex items-center gap-2 rounded-full bg-background/95 px-4 py-2 text-sm font-bold text-foreground shadow-sm transition">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            Banneri dəyiş
          </span>
        </span>
      </button>
      <div className="relative -mt-20 flex min-w-0 flex-col gap-3 px-4 pb-4 sm:-mt-24 sm:px-6 sm:pb-6 lg:px-8">
        <Button type="button" variant="outline" size="icon" onClick={() => logoInputRef.current?.click()} disabled={isPending} className="size-20 overflow-hidden rounded-xl border-2 border-background bg-background p-0 shadow-lg sm:size-24" aria-label="Logonu dəyiş">
          {store.logoUrl ? <img src={store.logoUrl} alt="" className="h-full w-full object-cover" /> : <span className="text-2xl font-black text-primary">{store.name.slice(0, 1)}</span>}
          <span className="absolute inset-0 grid place-items-center bg-black/45 text-white opacity-0 transition hover:opacity-100 focus-within:opacity-100"><ImagePlus className="size-5" /></span>
        </Button>
        <div className="min-w-0 rounded-xl bg-background/95 p-3 shadow-xl shadow-slate-950/10 backdrop-blur sm:p-4">
          <h1 className="truncate text-2xl font-black tracking-normal sm:text-3xl">{store.name}</h1>
          <form action={updateTitle} className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">
            <input
              name="heroTitle"
              defaultValue={store.heroTitle ?? ""}
              placeholder={`${store.name} mağazası`}
              className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
            <input
              name="heroSubtitle"
              defaultValue={store.heroSubtitle ?? ""}
              placeholder="390 məhsul • Elektronika və daha çox"
              className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
            <input
              name="socialInstagram"
              defaultValue={store.socialInstagram ?? ""}
              placeholder="Instagram linki və ya istifadəçi adı"
              className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30 lg:col-span-1"
            />
            <input
              name="socialTiktok"
              defaultValue={store.socialTiktok ?? ""}
              placeholder="TikTok linki və ya istifadəçi adı"
              className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30 lg:col-span-1"
            />
            <Button type="submit" disabled={isPending} className="h-10 gap-2">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Saxla
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
