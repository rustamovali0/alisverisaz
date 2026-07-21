"use client";

import { ImagePlus, Instagram, MessageCircle, Music2, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { updateSiteSettingsAction } from "@/lib/cms/actions";
import type { SiteSettings, ThemeSetting } from "@/lib/cms/types";
import { appAlert } from "@/lib/alerts/swal";
import { cn } from "@/lib/utils";

type SiteSettingsFormProps = {
  settings: SiteSettings;
  themes: ThemeSetting[];
};

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  );
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Logo oxuna bilmədi."));
    };
    image.src = url;
  });
}

async function convertToWebp(file: File) {
  if (file.type === "image/webp") {
    return file;
  }

  if (file.type !== "image/jpeg" && file.type !== "image/png") {
    throw new Error("Yalnız JPG, PNG və WebP qəbul edilir.");
  }

  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Logo çevrilməsi mümkün olmadı.");
  }

  context.drawImage(image, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) =>
        nextBlob ? resolve(nextBlob) : reject(new Error("WebP çevrilməsi alınmadı.")),
      "image/webp",
      0.88,
    );
  });

  return new File([blob], file.name.replace(/\.(jpe?g|png|webp)$/i, ".webp"), {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

function LogoUploadField({
  label,
  fileName,
  urlName,
  defaultValue,
}: {
  label: string;
  fileName: string;
  urlName: string;
  defaultValue?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedName, setSelectedName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  async function setFile(file: File) {
    setIsConverting(true);
    try {
      const converted = await convertToWebp(file);
      const transfer = new DataTransfer();
      transfer.items.add(converted);

      if (inputRef.current) {
        inputRef.current.files = transfer.files;
      }

      setSelectedName(converted.name);
    } catch (error) {
      await appAlert.error(
        error instanceof Error ? error.message : "Logo seçilmədi.",
        "Logo yüklənmədi",
      );
    } finally {
      setIsConverting(false);
    }
  }

  return (
    <div className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
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
          const file = event.dataTransfer.files[0];

          if (file) {
            void setFile(file);
          }
        }}
        className={cn(
          "flex min-h-28 flex-col items-center justify-center rounded-md border border-dashed bg-background px-4 py-5 text-center transition",
          isDragging ? "border-primary bg-primary/5" : "border-input",
        )}
      >
        <ImagePlus className="mb-2 size-6 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm">
          {isConverting
            ? "WebP çevrilir"
            : selectedName || "Logo faylını buraya sürüklə"}
        </span>
        <span className="mt-1 text-xs text-muted-foreground">
          JPG və PNG avtomatik WebP formatına çevrilir
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        name={fileName}
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            void setFile(file);
          }
        }}
      />
      {selectedName ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => {
            if (inputRef.current) {
              inputRef.current.value = "";
            }
            setSelectedName("");
          }}
        >
          <X className="mr-2 size-4" aria-hidden="true" />
          Seçiləni sil
        </Button>
      ) : null}
      <input
        name={urlName}
        defaultValue={defaultValue ?? ""}
        placeholder="və ya mövcud URL saxla"
        className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}

export function SiteSettingsForm({ settings, themes }: SiteSettingsFormProps) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateSiteSettingsAction(formData);

      if (!result.ok) {
        await appAlert.error(result.message, "Ayarlar saxlanmadı");
        return;
      }

      await appAlert.success("Ayarlar saxlandı", result.message);
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Sayt adı" name="siteName" defaultValue={settings.siteName} />
        <Field label="Qısa ad" name="shortName" defaultValue={settings.shortName} />
        <LogoUploadField
          label="Logo"
          fileName="logoFile"
          urlName="logoUrl"
          defaultValue={settings.logoUrl}
        />
        <LogoUploadField
          label="Dark mode logo"
          fileName="darkLogoFile"
          urlName="darkLogoUrl"
          defaultValue={settings.darkLogoUrl}
        />
        <LogoUploadField
          label="Favicon"
          fileName="faviconFile"
          urlName="faviconUrl"
          defaultValue={settings.faviconUrl}
        />
        <Field
          label="Əlaqə emaili"
          name="contactEmail"
          defaultValue={settings.contactEmail}
        />
        <label className="grid gap-2 text-sm font-medium">
          Telefon
          <PhoneInput name="phone" defaultValue={settings.phone} />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          WhatsApp
          <PhoneInput name="whatsapp" defaultValue={settings.whatsapp} />
        </label>
      </div>

      <Field label="Ünvan" name="address" defaultValue={settings.address} />
      <Field
        label="Default SEO title"
        name="defaultSeoTitle"
        defaultValue={settings.defaultSeoTitle}
      />
      <label className="grid gap-2 text-sm font-medium">
        Default meta description
        <textarea
          name="defaultMetaDescription"
          defaultValue={settings.defaultMetaDescription}
          className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <Field
        label="Default SEO keywords"
        name="defaultSeoKeywords"
        defaultValue={settings.defaultSeoKeywords}
      />
      <input
        type="hidden"
        name="socialLinksJson"
        value={JSON.stringify(settings.socialLinks)}
      />
      <div className="grid gap-4 rounded-md border bg-background p-4 lg:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium">
          <span className="inline-flex items-center gap-2">
            <Instagram className="size-4" aria-hidden="true" />
            Instagram
          </span>
          <input
            name="socialInstagram"
            defaultValue={settings.socialLinks.instagram ?? ""}
            placeholder="https://instagram.com/alisveris.az"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          <span className="inline-flex items-center gap-2">
            <Music2 className="size-4" aria-hidden="true" />
            TikTok
          </span>
          <input
            name="socialTiktok"
            defaultValue={settings.socialLinks.tiktok ?? ""}
            placeholder="https://tiktok.com/@alisveris.az"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          <span className="inline-flex items-center gap-2">
            <MessageCircle className="size-4" aria-hidden="true" />
            WhatsApp
          </span>
          <PhoneInput
            name="socialWhatsapp"
            defaultValue={settings.socialLinks.whatsapp ?? settings.whatsapp}
          />
        </label>
      </div>
      <Field
        label="Copyright mətni"
        name="copyrightText"
        defaultValue={settings.copyrightText}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Aktiv ana səhifə teması
          <select
            name="activeHomeTheme"
            defaultValue={settings.activeHomeTheme}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {themes.map((theme) => (
              <option key={theme.themeKey} value={theme.themeKey}>
                {theme.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Default görünüş rejimi
          <select
            name="defaultThemeMode"
            defaultValue={settings.defaultThemeMode}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 rounded-md border bg-background p-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["maintenanceMode", "Texniki rejim", settings.maintenanceMode],
          [
            "userRegistrationEnabled",
            "İstifadəçi qeydiyyatı",
            settings.userRegistrationEnabled,
          ],
          [
            "storeRegistrationEnabled",
            "Mağaza qeydiyyatı",
            settings.storeRegistrationEnabled,
          ],
          ["depositEnabled", "Beh sistemi", settings.depositEnabled],
        ].map(([name, label, checked]) => (
          <label key={String(name)} className="flex items-center gap-2 text-sm font-medium">
            <input
              name={String(name)}
              type="checkbox"
              defaultChecked={Boolean(checked)}
              className="size-4 rounded border-input"
            />
            {label}
          </label>
        ))}
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saxlanılır" : "Ayarları saxla"}
      </Button>
    </form>
  );
}
