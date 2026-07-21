"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { updateSiteSettingsAction } from "@/lib/cms/actions";
import type { SiteSettings, ThemeSetting } from "@/lib/cms/types";
import { appAlert } from "@/lib/alerts/swal";

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
        <Field label="Logo URL" name="logoUrl" defaultValue={settings.logoUrl} />
        <Field
          label="Dark mode logo URL"
          name="darkLogoUrl"
          defaultValue={settings.darkLogoUrl}
        />
        <Field
          label="Favicon URL"
          name="faviconUrl"
          defaultValue={settings.faviconUrl}
        />
        <Field
          label="Əlaqə emaili"
          name="contactEmail"
          defaultValue={settings.contactEmail}
        />
        <Field label="Telefon" name="phone" defaultValue={settings.phone} />
        <Field label="WhatsApp" name="whatsapp" defaultValue={settings.whatsapp} />
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
      <label className="grid gap-2 text-sm font-medium">
        Sosial linklər JSON
        <textarea
          name="socialLinks"
          defaultValue={JSON.stringify(settings.socialLinks, null, 2)}
          className="min-h-24 rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
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
