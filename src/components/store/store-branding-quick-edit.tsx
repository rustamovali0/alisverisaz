"use client";

import { ImagePlus, Loader2, Save } from "lucide-react";
import { useRef, useState, useTransition } from "react";
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
type EditableFieldKey = "heroTitle" | "heroSubtitle" | "socialInstagram" | "socialTiktok";

const editableFields: Array<{
  key: EditableFieldKey;
  label: string;
  placeholder: (storeName: string) => string;
}> = [
  {
    key: "heroTitle",
    label: "Başlıq",
    placeholder: (storeName) => `${storeName} mağazası`,
  },
  {
    key: "heroSubtitle",
    label: "Alt mətn",
    placeholder: () => "390 məhsul • Elektronika və daha çox",
  },
  {
    key: "socialInstagram",
    label: "Instagram",
    placeholder: () => "Instagram linki və ya istifadəçi adı",
  },
  {
    key: "socialTiktok",
    label: "TikTok",
    placeholder: () => "TikTok linki və ya istifadəçi adı",
  },
];

export function StoreBrandingQuickEdit({ store }: StoreBrandingQuickEditProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingField, setEditingField] = useState<EditableFieldKey | null>(null);
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
      setEditingField(null);
      router.refresh();
    });
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-lg bg-card shadow-sm">
      <input ref={bannerInputRef} type="file" accept={IMAGE_ACCEPT} className="sr-only" onChange={(event) => replaceImage("banner", event.target.files?.[0] ?? null)} />
      <input ref={logoInputRef} type="file" accept={IMAGE_ACCEPT} className="sr-only" onChange={(event) => replaceImage("logo", event.target.files?.[0] ?? null)} />
      <button type="button" onClick={() => bannerInputRef.current?.click()} disabled={isPending} className="group relative block min-h-[170px] w-full overflow-hidden bg-primary/10 text-left disabled:cursor-wait sm:min-h-[240px] lg:min-h-[280px]" aria-label="Banneri dəyiş">
        <img src={store.coverUrl || DEFAULT_MARKETPLACE_BANNER_URL} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <span className="absolute inset-0 bg-slate-950/45" aria-hidden="true" />
        <span className="absolute inset-0 grid place-items-center bg-black/0 transition group-hover:bg-black/15 group-focus-visible:bg-black/15">
          <span className="inline-flex items-center gap-2 rounded-full bg-background/95 px-4 py-2 text-sm font-bold text-foreground shadow-sm transition">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            Banneri dəyiş
          </span>
        </span>
      </button>
      <div className="relative -mt-12 flex min-w-0 flex-col gap-4 px-4 pb-5 sm:-mt-14 sm:px-6 sm:pb-6 lg:px-7">
        <Button type="button" variant="outline" size="icon" onClick={() => logoInputRef.current?.click()} disabled={isPending} className="size-16 overflow-hidden rounded-xl border-2 border-background bg-background p-0 shadow-lg sm:size-20" aria-label="Logonu dəyiş">
          {store.logoUrl ? <img src={store.logoUrl} alt="" className="h-full w-full object-cover" /> : <span className="text-2xl font-black text-primary">{store.name.slice(0, 1)}</span>}
          <span className="absolute inset-0 grid place-items-center bg-black/45 text-white opacity-0 transition hover:opacity-100 focus-within:opacity-100"><ImagePlus className="size-5" /></span>
        </Button>
        <div className="min-w-0 rounded-xl bg-background/95 p-3 shadow-xl shadow-slate-950/10 backdrop-blur sm:p-4">
          <h1 className="truncate text-2xl font-black tracking-normal sm:text-3xl">{store.name}</h1>
          <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">
            {editableFields.map((field) => {
              const value = store[field.key] ?? "";
              const placeholder = field.placeholder(store.name);
              const isEditing = editingField === field.key;

              return (
                <div key={field.key} className="min-w-0 rounded-lg border border-cyan-100 bg-[#f6fbfa] px-3 py-2 dark:border-cyan-200/15 dark:bg-slate-900/70">
                  <p className="text-[11px] font-black uppercase text-muted-foreground">{field.label}</p>
                  {isEditing ? (
                    <form action={updateTitle} className="mt-2 grid gap-2">
                      <input
                        name={field.key}
                        defaultValue={value}
                        placeholder={placeholder}
                        autoFocus
                        className="h-9 min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30"
                      />
                      <div className="flex items-center gap-2">
                        <Button type="submit" disabled={isPending} size="sm" className="h-8 gap-1.5 rounded-lg px-3">
                          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                          Saxla
                        </Button>
                        <button
                          type="button"
                          onClick={() => setEditingField(null)}
                          className="text-xs font-bold text-muted-foreground transition hover:text-foreground"
                        >
                          Bağla
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <p className="mt-1 min-h-5 break-words text-sm font-semibold text-foreground">
                        {value || placeholder}
                      </p>
                      <button
                        type="button"
                        onClick={() => setEditingField(field.key)}
                        className="mt-1 text-xs font-black text-primary transition hover:underline"
                      >
                        Redaktə
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
