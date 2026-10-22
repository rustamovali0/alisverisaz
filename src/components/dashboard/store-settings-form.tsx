"use client";

import { Copy, ExternalLink, ImagePlus, Loader2, Save } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { updateSellerStoreSettingsAction } from "@/lib/store-settings/actions";
import { appAlert } from "@/lib/alerts/app-alert";
import { getStorefrontUrl, getStorePath } from "@/lib/config/domains";
import { updateSellerOrderMethodAction } from "@/lib/whatsapp-orders/actions";
import { normalizeOrderMethod } from "@/lib/whatsapp-orders/template";
import { cn } from "@/lib/utils";
import { clearClientAuthProfileCache } from "@/lib/auth/use-client-auth-profile";

type StoreSettingsFormProps = {
  store: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    cover_url: string | null;
    settings: Record<string, unknown> | null;
  };
  availableCategories?: Array<{ id: string; name: string }>;
};

function readSetting(settings: Record<string, unknown> | null | undefined, key: string) {
  const value = settings?.[key];

  return typeof value === "string" ? value : "";
}

function readBooleanSetting(settings: Record<string, unknown> | null | undefined, key: string) {
  return settings?.[key] === true;
}

function MediaPicker({
  name,
  label,
  currentUrl,
  ratio,
  positionX = 50,
  positionY = 50,
}: {
  name: string;
  label: string;
  currentUrl: string | null;
  ratio: string;
  positionX?: number;
  positionY?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(currentUrl ?? "");
  const [x, setX] = useState(positionX);
  const [y, setY] = useState(positionY);
  const imageRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number; overflowX: number; overflowY: number } | null>(null);
  const isBanner = name === "banner";

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

    if (inputRef.current && inputRef.current.files !== files) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      inputRef.current.files = transfer.files;
    }
    setX(50);
    setY(50);

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
      <div
        onPointerDown={(event) => {
          const image = imageRef.current;
          if (!isBanner || !image?.naturalWidth) return;
          const { width, height } = event.currentTarget.getBoundingClientRect();
          const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
          drag.current = { x: event.clientX, y: event.clientY, px: x, py: y,
            overflowX: image.naturalWidth * scale - width, overflowY: image.naturalHeight * scale - height };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (!start) return;
          if (start.overflowX > 1) setX(Math.max(0, Math.min(100, start.px - (event.clientX - start.x) / start.overflowX * 100)));
          if (start.overflowY > 1) setY(Math.max(0, Math.min(100, start.py - (event.clientY - start.y) / start.overflowY * 100)));
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
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
          "relative grid w-full place-items-center overflow-hidden rounded-md border border-dashed bg-background text-center transition",
          ratio,
          isBanner && preview && "touch-none cursor-move",
          isDragging ? "border-primary bg-primary/5" : "border-input",
        )}
      >
        {preview ? (
          <img ref={imageRef} src={preview} alt={label} draggable={false} style={{ objectPosition: `${x}% ${y}%` }} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="grid place-items-center gap-2 text-sm text-muted-foreground">
            <ImagePlus className="size-7" aria-hidden="true" />
            <span className="sm:hidden">Şəkil seç</span>
            <span className="hidden sm:inline">Şəkli seç və ya buraya sürüklə</span>
          </div>
        )}
      </div>
      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => inputRef.current?.click()}>
        <ImagePlus className="mr-2 size-4" aria-hidden="true" />Şəkil seç
      </Button>
      {isBanner && preview ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs">Üfüqi
            <input type="range" min="0" max="100" value={x} onChange={(event) => setX(Number(event.target.value))} />
          </label>
          <label className="grid gap-1 text-xs">Şaquli
            <input type="range" min="0" max="100" value={y} onChange={(event) => setY(Number(event.target.value))} />
          </label>
        </div>
      ) : null}
      {isBanner ? <><input type="hidden" name="bannerPositionX" value={x} /><input type="hidden" name="bannerPositionY" value={y} /></> : null}
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

export function StoreSettingsForm({ store, availableCategories = [] }: StoreSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isOrderMethodPending, startOrderMethodTransition] = useTransition();
  const customStorefrontEnabled = readBooleanSetting(store.settings, "customStorefrontEnabled");
  const publicUrl = customStorefrontEnabled ? getStorefrontUrl(store.slug) : getStorePath(store.slug);
  const heroTitle = readSetting(store.settings, "heroTitle");
  const heroSubtitle = readSetting(store.settings, "heroSubtitle");
  const customDomain = readSetting(store.settings, "customDomain");
  const aboutContent = readSetting(store.settings, "aboutContent");
  const orderMethod = normalizeOrderMethod(store.settings?.orderMethod);
  const whatsappPhone = readSetting(store.settings, "whatsappPhone");
  const storefrontHeroUrl = readSetting(store.settings, "storefrontHeroUrl");
  const featuredCategoryIds = Array.isArray(store.settings?.featuredCategoryIds)
    ? store.settings.featuredCategoryIds.filter((item): item is string => typeof item === "string")
    : [];

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateSellerStoreSettingsAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Ayarlar saxlanmadı");
        return;
      }

      void appAlert.success("Ayarlar yeniləndi", result.message);
      clearClientAuthProfileCache();
    });
  }

  function handleOrderMethodSubmit(formData: FormData) {
    startOrderMethodTransition(async () => {
      const result = await updateSellerOrderMethodAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Sifariş üsulu saxlanmadı");
        return;
      }

      void appAlert.success("Sifariş üsulu saxlandı", result.message);
    });
  }

  const saveButton = (label = "Yadda saxla") => (
    <Button type="submit" disabled={isPending} className="w-full sm:w-fit">
      {isPending ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> : <Save className="mr-2 size-4" aria-hidden="true" />}
      {isPending ? "Saxlanılır" : label}
    </Button>
  );

  return (
    <div className="grid gap-5">
      <form action={handleOrderMethodSubmit} className="premium-card grid gap-5 p-5">
        <input type="hidden" name="storeId" value={store.id} />
        <div>
          <h2 className="text-xl font-black tracking-normal">Sifariş qəbul etmə üsulu</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sifarişlər sayt üzərindən və ya WhatsApp üzərindən qəbul edilə bilər.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-lg border bg-background p-4 text-sm font-semibold">
            <input
              type="radio"
              name="orderMethod"
              value="system"
              defaultChecked={orderMethod === "system"}
              className="size-4"
            />
            Sayt üzərindən
          </label>
          <label className="flex items-center gap-3 rounded-lg border bg-background p-4 text-sm font-semibold">
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
        <label className="grid gap-2 text-sm font-medium">
          WhatsApp nömrəsi
          <PhoneInput name="whatsappPhone" defaultValue={whatsappPhone} />
          <span className="text-xs text-muted-foreground">
            WhatsApp üzərindən sifariş qəbul etmək üçün nömrə mütləqdir.
          </span>
        </label>
        <Button type="submit" disabled={isOrderMethodPending} className="w-fit">
          {isOrderMethodPending ? "Saxlanılır" : "Sifariş üsulunu saxla"}
        </Button>
      </form>

      <form action={handleSubmit} className="grid gap-4">
        <input type="hidden" name="storeId" value={store.id} />
        <input type="hidden" name="profitTrackingPresent" value="1" />
        <section className="premium-card grid gap-4 p-4 sm:p-5">
        <div>
          <h2 className="text-xl font-black tracking-normal">Mağaza məlumatları</h2>
          <p className="mt-1 text-sm text-muted-foreground">Ad, mağaza ünvanı və əsas iş ayarlarını idarə edin.</p>
        </div>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" name="profitTrackingEnabled" className="size-4"
            defaultChecked={readBooleanSetting(store.settings, "profitTrackingEnabled")}
            disabled={isPending} />
          Qazanc hesablaması
        </label>
        {customStorefrontEnabled ? <div className="rounded-lg border bg-background p-3">
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
        </div> : null}
        <label className="grid gap-2 text-sm font-medium">
          Mağaza adı
          <input
            name="name"
            defaultValue={store.name}
            autoCapitalize="words"
            className="premium-input h-11"
            required
          />
        </label>
        {customStorefrontEnabled ? <label className="grid gap-2 text-sm font-medium">
          Mağaza URL-i
          <input
            name="slug"
            defaultValue={store.slug}
            placeholder="magazaadi"
            className="premium-input h-11"
            required
          />
          <span className="text-xs text-muted-foreground">
            RAdmin icazəsi aktivdir: /{store.slug} və subdomain işləyir, bu adı dəyişə bilərsiniz.
          </span>
        </label> : <input type="hidden" name="slug" value={store.slug} />}
        <label className="grid gap-2 text-sm font-medium">
          Vitrin başlığı
          <input
            name="heroTitle"
            defaultValue={heroTitle}
            placeholder="Seçilmiş məhsulları kəşf edin"
            className="premium-input h-11"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Vitrin alt mətni
          <input
            name="heroSubtitle"
            defaultValue={heroSubtitle}
            placeholder="Məhsullarınız haqqında qısa təqdimat"
            className="premium-input h-11"
          />
        </label>
        {customStorefrontEnabled ? (
          <label className="grid gap-2 text-sm font-medium">
            Şəxsi domain
            <input
              name="customDomain"
              defaultValue={customDomain}
              placeholder="shop.example.com"
              inputMode="url"
              autoCapitalize="none"
              className="premium-input h-11"
            />
            <span className="text-xs leading-5 text-muted-foreground">
              Protokol yazmadan domaini daxil edin. Domainin DNS A qeydini 178.208.187.209 ünvanına yönəldin. SSL aktivləşməsi üçün domain saxlandıqdan sonra administrator yoxlaması tələb olunur.
            </span>
          </label>
        ) : null}
        {saveButton("Mağaza məlumatlarını saxla")}
        </section>
        <section className="premium-card grid gap-4 p-4 sm:p-5">
          <div>
            <h2 className="text-xl font-black tracking-normal">Vitrin məzmunu</h2>
            <p className="mt-1 text-sm text-muted-foreground">Başlıq, təqdimat və önə çıxan kateqoriyaları yeniləyin.</p>
          </div>
        {customStorefrontEnabled && availableCategories.length > 0 ? (
          <fieldset className="grid gap-3 rounded-xl border bg-background p-4">
            <input type="hidden" name="featuredCategoriesPresent" value="1" />
            <div>
              <legend className="font-bold">Önə çıxan kateqoriyalar</legend>
              <p className="mt-1 text-xs text-muted-foreground">Yalnız aktiv məhsulu olan kateqoriyalar göstərilir. Ən çox 4 seçim edin.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {availableCategories.map((category) => (
                <label key={category.id} className="flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium">
                  <input type="checkbox" name="featuredCategoryIds" value={category.id} defaultChecked={featuredCategoryIds.includes(category.id)} className="size-4" />
                  {category.name}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        <label className="grid gap-2 text-sm font-medium">
          Haqqında məlumatı
          <textarea
            name="aboutContent"
            defaultValue={aboutContent}
            placeholder="Mağazanız, məhsullarınız və xidmətiniz haqqında qısa məlumat yazın."
            className="premium-input min-h-36 resize-y py-3 leading-6"
          />
          <span className="text-xs text-muted-foreground">
            Bu mətn /{store.slug} və {store.slug}.alisveris.az mağaza səhifəsində “Haqqında” bölməsində görünəcək.
          </span>
        </label>
        {saveButton("Vitrin məzmununu saxla")}
        </section>
        <section className="premium-card grid gap-4 p-4 sm:p-5">
          <div>
            <h2 className="text-xl font-black tracking-normal">Logo və banner</h2>
            <p className="mt-1 text-sm text-muted-foreground">Mağazanın əsas vizual görünüşünü dəyişin.</p>
          </div>
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
            positionX={typeof store.settings?.bannerPositionX === "number" ? store.settings.bannerPositionX : 50}
            positionY={typeof store.settings?.bannerPositionY === "number" ? store.settings.bannerPositionY : 50}
          />
        </div>
        {saveButton("Logo və banneri saxla")}
        </section>
        {customStorefrontEnabled ? (
          <section className="premium-card grid gap-4 border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900/50 dark:bg-blue-950/20 sm:p-5">
            <div>
              <h3 className="font-bold text-slate-950 dark:text-slate-100">Subdomain vitrin şəkli</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Bu şəkil yalnız /{store.slug} və subdomain mağaza səhifəsində görünür. Seçilməyibsə banner, banner də yoxdursa standart şəkil göstərilir.
              </p>
            </div>
            <MediaPicker
              name="storefrontHero"
              label="Şəxsi mağaza vitrin şəkli"
              currentUrl={storefrontHeroUrl || store.cover_url || "/auth/auth-banner.webp"}
              ratio="aspect-[16/9] max-w-2xl"
            />
            {saveButton("Vitrin şəklini saxla")}
          </section>
        ) : null}
      </form>
    </div>
  );
}
