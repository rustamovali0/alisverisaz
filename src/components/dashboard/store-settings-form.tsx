"use client";

import { Copy, ExternalLink, ImagePlus } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { updateSellerStoreSettingsAction } from "@/lib/store-settings/actions";
import { appAlert } from "@/lib/alerts/app-alert";
import { getStorefrontUrl } from "@/lib/config/domains";
import { cn } from "@/lib/utils";

type StoreSettingsFormProps = {
  store: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    cover_url: string | null;
    settings: Record<string, unknown> | null;
  };
};

function readSetting(settings: Record<string, unknown> | null | undefined, key: string) {
  const value = settings?.[key];

  return typeof value === "string" ? value : "";
}

function MediaPicker({
  name,
  label,
  currentUrl,
  ratio,
}: {
  name: string;
  label: string;
  currentUrl: string | null;
  ratio: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(currentUrl ?? "");

  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) {
      return;
    }

    const nextPreview = URL.createObjectURL(file);
    setPreview((previous) => {
      if (previous.startsWith("blob:")) {
        URL.revokeObjectURL(previous);
      }

      return nextPreview;
    });
  }

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        className={cn(
          "relative grid w-full place-items-center overflow-hidden rounded-md border border-dashed bg-background p-3 text-center transition",
          ratio,
          isDragging ? "border-primary bg-primary/5" : "border-input",
        )}
      >
        {preview ? (
          <img src={preview} alt={label} className="h-full w-full rounded object-cover" />
        ) : (
          <div className="grid place-items-center gap-2 text-sm text-muted-foreground">
            <ImagePlus className="size-7" aria-hidden="true" />
            <span className="sm:hidden">Şəkil seç</span>
            <span className="hidden sm:inline">Şəkli seç və ya buraya sürüklə</span>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/*,.heic,.heif,.avif,.tif,.tiff,.bmp"
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />
    </div>
  );
}

export function StoreSettingsForm({ store }: StoreSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const publicUrl = getStorefrontUrl(store.slug);
  const heroTitle = readSetting(store.settings, "heroTitle");

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateSellerStoreSettingsAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Ayarlar saxlanmadı");
        return;
      }

      void appAlert.success("Ayarlar yeniləndi", result.message);
    });
  }

  return (
    <form action={handleSubmit} encType="multipart/form-data" className="premium-card grid gap-5 p-5">
      <input type="hidden" name="storeId" value={store.id} />
      <div>
        <h2 className="text-xl font-black tracking-normal">Əsas ayarlar</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Mağaza adı, logo və banner şəklini buradan yeniləyin.
        </p>
      </div>
      <div className="rounded-lg border bg-background p-3">
        <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          Public mağaza URL
        </p>
        <div className="mt-2 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-3 py-2 text-sm">
            {publicUrl}
          </code>
          <div className="flex gap-2">
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
      <label className="grid gap-2 text-sm font-medium">
        Mağaza adı
        <input
          name="name"
          defaultValue={store.name}
          className="premium-input h-11"
          required
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Mağaza səhifəsində title
        <input
          name="heroTitle"
          defaultValue={heroTitle}
          placeholder={`${store.name}ya xoş gəlmisiniz`}
          className="premium-input h-11"
        />
      </label>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <MediaPicker
          name="logo"
          label="Profil şəkli / Logo"
          currentUrl={store.logo_url}
          ratio="aspect-square max-w-[220px]"
        />
        <MediaPicker
          name="banner"
          label="Banner şəkli"
          currentUrl={store.cover_url}
          ratio="aspect-[16/6]"
        />
      </div>
      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Saxlanılır" : "Yadda saxla"}
      </Button>
    </form>
  );
}
