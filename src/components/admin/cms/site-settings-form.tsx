"use client";

import { ImagePlus, Instagram, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { TikTokIcon, WhatsAppIcon } from "@/components/icons/social-icons";
import { PhoneInput } from "@/components/ui/phone-input";
import { updateSiteSettingsAction } from "@/lib/cms/actions";
import type { SiteSettings, ThemeSetting } from "@/lib/cms/types";
import { appAlert } from "@/lib/alerts/app-alert";
import { isRealImageFile } from "@/lib/images/client-file-validation";
import { cn } from "@/lib/utils";

type SiteSettingsFormProps = {
  settings: SiteSettings;
  themes: ThemeSetting[];
};

const loaderTypeOptions = [
  ["classic", "Klassik dairə"],
  ["dual", "İkili dairə"],
  ["dots-circle", "Dairəvi nöqtələr"],
  ["moving-dots", "3 hərəkətli nöqtə"],
  ["half", "Yarım dairə"],
  ["wave", "Dalğalı dairə"],
  ["pulse", "Pulsing dairə"],
  ["clock", "Saat əqrəbi"],
  ["oval", "Oval loader"],
  ["gradient", "Gradient dairə"],
] as const;

const loaderPaletteOptions = [
  ["primary", "Tema rəngi"],
  ["cyan", "Cyan"],
  ["emerald", "Yaşıl"],
  ["rose", "Rose"],
  ["amber", "Amber"],
  ["violet", "Violet"],
] as const;

const mobileNavbarOptions = [
  ["classic", "Classic"],
  ["floating", "Floating"],
  ["pill", "Pill"],
  ["compact", "Compact"],
  ["outlined", "Outlined"],
  ["soft", "Soft"],
  ["solid", "Solid"],
  ["glass", "Glass"],
  ["minimal", "Minimal"],
  ["rail", "Rail"],
] as const;

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

function LimitField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: number | null;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input
        name={name}
        type="number"
        min="0"
        step="1"
        placeholder="Limitsiz"
        defaultValue={defaultValue ?? ""}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  );
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
  const previewUrlRef = useRef<string | null>(defaultValue ?? null);
  const [selectedName, setSelectedName] = useState("");
  const [previewUrl, setPreviewUrl] = useState(defaultValue ?? "");
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  useEffect(
    () => () => {
      if (previewUrlRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    },
    [],
  );

  async function setFile(file: File) {
    setIsConverting(true);
    try {
      if (!(await isRealImageFile(file))) {
        throw new Error("Yalnız həqiqi şəkil faylı seçin.");
      }

      const nextPreviewUrl = URL.createObjectURL(file);

      if (previewUrlRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      previewUrlRef.current = nextPreviewUrl;
      setPreviewUrl(nextPreviewUrl);
      const transfer = new DataTransfer();
      transfer.items.add(file);

      if (inputRef.current) {
        inputRef.current.files = transfer.files;
      }

      setSelectedName(file.name);
    } catch (error) {
      void appAlert.error(
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
      <div className="overflow-hidden rounded-xl border bg-muted/20 shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b bg-background/80 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Canlı önizləmə
            </p>
            <p className="text-sm font-semibold">{label}</p>
          </div>
          <span className="rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            {previewUrl ? "Hazır" : "Boşdur"}
          </span>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="grid size-20 place-items-center overflow-hidden rounded-xl border bg-background shadow-sm">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={label}
                className="h-full w-full object-cover"
              />
            ) : (
              <ImagePlus className="size-8 text-muted-foreground" aria-hidden="true" />
            )}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              {selectedName || (previewUrl ? "Cari şəkil göstərilir" : "Şəkil seçilməyib")}
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              Şəkil faylı seçin. Fayl serverdə təhlükəsiz şəkildə WebP formatına çevrilir.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                Drag & drop
              </span>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                Serverdə WebP
              </span>
            </div>
          </div>
        </div>
      </div>
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
            ? "Şəkil hazırlanır"
            : selectedName || "Logo faylını buraya sürüklə"}
        </span>
        <span className="mt-1 text-xs text-muted-foreground">
          JPG, JPEG, PNG və digər dəstəklənən şəkillər qəbul edilir
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        name={fileName}
        accept="image/*,.heic,.heif,.avif,.tif,.tiff,.bmp"
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
          <X className="mr-2 size-5 stroke-[2.5]" aria-hidden="true" />
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
        void appAlert.error(result.message, "Ayarlar saxlanmadı");
        return;
      }

      void appAlert.success("Ayarlar saxlandı", result.message);
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-4">
              <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border bg-background shadow-sm">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt={settings.siteName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xl font-black text-primary">
                    {settings.shortName.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Brend xülasəsi
                </p>
                <h3 className="truncate text-2xl font-black tracking-normal">
                  {settings.siteName}
                </h3>
                <p className="truncate text-sm text-muted-foreground">{settings.defaultSeoTitle}</p>
              </div>
            </div>
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
              Aktiv
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["Domain", settings.shortName || "Qısa ad yoxdur"],
              ["Email", settings.contactEmail || "Təyin edilməyib"],
              ["Telefon", settings.phone || "Təyin edilməyib"],
              ["WhatsApp", settings.whatsapp || "Təyin edilməyib"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border bg-background p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 truncate text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-muted/25 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Canlı görünüş
              </p>
              <h3 className="mt-2 text-lg font-black tracking-normal">Logo və sosial hissə</h3>
            </div>
            <span className="rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              {themes.length} tema
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            <div className="rounded-xl border bg-background p-4 shadow-sm">
              <p className="text-sm font-semibold">Header markası</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="grid size-12 place-items-center overflow-hidden rounded-xl border bg-card">
                  {settings.darkLogoUrl ? (
                    <img src={settings.darkLogoUrl} alt={`${settings.siteName} dark`} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-black text-primary">
                      {settings.siteName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{settings.siteName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {settings.defaultMetaDescription || "SEO izahı əlavə edilməyib."}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Logo", settings.logoUrl],
                ["Dark", settings.darkLogoUrl],
                ["Favicon", settings.faviconUrl],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border bg-background p-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {label}
                  </p>
                  <div className="mt-3 grid size-14 place-items-center overflow-hidden rounded-lg border bg-muted">
                    {value ? (
                      <img src={value} alt={label} className="h-full w-full object-cover" />
                    ) : (
                      <ImagePlus className="size-5 text-muted-foreground" aria-hidden="true" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

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
            placeholder="https://instagram.com/alışveriş"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          <span className="inline-flex items-center gap-2">
            <TikTokIcon className="size-4" />
            TikTok
          </span>
          <input
            name="socialTiktok"
            defaultValue={settings.socialLinks.tiktok ?? ""}
            placeholder="https://tiktok.com/@alışveriş"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          <span className="inline-flex items-center gap-2">
            <WhatsAppIcon className="size-4" />
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

      <section className="grid gap-4 rounded-md border bg-background p-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <p className="text-sm font-semibold">Seller elan limitləri</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Fərdi mağaza limiti təyin edilməyibsə bu default dəyərlər istifadə olunur.
          </p>
        </div>
        <LimitField
          label="Default məhsul limiti"
          name="defaultProductLimit"
          defaultValue={settings.subscriptionLimits.defaultProductLimit}
        />
        <LimitField
          label="Default məhsul şəkil limiti"
          name="defaultImagesPerProductLimit"
          defaultValue={settings.subscriptionLimits.defaultImagesPerProductLimit}
        />
      </section>

      <section className="grid gap-4 rounded-md border bg-background p-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <p className="text-sm font-semibold">Global loader</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Bütün sayt üzrə minimal yüklənmə animasiyası.
          </p>
        </div>
        <label className="grid gap-2 text-sm font-medium">
          Loader tipi
          <select
            name="globalLoaderType"
            defaultValue={settings.globalLoader.type}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {loaderTypeOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Loader rəngi
          <select
            name="globalLoaderPalette"
            defaultValue={settings.globalLoader.palette}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {loaderPaletteOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="grid gap-4 rounded-md border bg-background p-4 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold">Mobile navbar</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Mobil alt naviqasiyanın qlobal dizayn variantı.
          </p>
        </div>
        <label className="grid gap-2 text-sm font-medium">
          Navbar dizaynı
          <select
            name="mobileNavbarVariant"
            defaultValue={settings.mobileNavbarVariant}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {mobileNavbarOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </section>

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
          [
            "showSubscriptionInSellerPanel",
            "Seller paneldə abunəliyi göstər",
            settings.showSubscriptionInSellerPanel &&
              !settings.subscriptionsDisabledForSellers,
          ],
          [
            "showWhatsappOrderButton",
            "Product detail WhatsApp sifariş düyməsi",
            settings.showWhatsappOrderButton,
          ],
          [
            "orderEmailNotificationsEnabled",
            "Sifariş email bildirişləri",
            settings.orderEmailNotificationsEnabled,
          ],
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
