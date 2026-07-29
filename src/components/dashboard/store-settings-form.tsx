"use client";

import { ImagePlus } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { updateSellerStoreSettingsAction } from "@/lib/store-settings/actions";
import { appAlert } from "@/lib/alerts/app-alert";
import { cn } from "@/lib/utils";

type StoreSettingsFormProps = {
  store: {
    id: string;
    name: string;
    logo_url: string | null;
    cover_url: string | null;
  };
};

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
            Şəkli buraya sürüklə
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />
    </div>
  );
}

export function StoreSettingsForm({ store }: StoreSettingsFormProps) {
  const [isPending, startTransition] = useTransition();

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
      <label className="grid gap-2 text-sm font-medium">
        Mağaza adı
        <input
          name="name"
          defaultValue={store.name}
          className="premium-input h-11"
          required
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
