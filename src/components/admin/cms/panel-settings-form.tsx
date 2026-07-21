"use client";

import { useMemo, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { updatePanelSettingsAction } from "@/lib/cms/actions";
import type { PanelFeatureSettings } from "@/lib/cms/types";
import { dashboardNavigation } from "@/lib/dashboard/navigation";
import { appAlert } from "@/lib/alerts/swal";

type PanelSettingsFormProps = {
  kind: "store" | "user";
  settings: PanelFeatureSettings;
};

const storeFeatures = [
  ["products", "Məhsullar"],
  ["orders", "Sifarişlər"],
  ["deposits", "Beh sifarişləri"],
  ["customers", "Müştərilər"],
  ["analytics", "Analitika"],
  ["subscription", "Abunəlik"],
  ["settings", "Ayarlar"],
] as const;

const userFeatures = [
  ["listings", "Elanlarım"],
  ["orders", "Sifarişlər"],
  ["favorites", "Favorilər"],
  ["payments", "Ödənişlər"],
  ["profile", "Profil"],
] as const;

function readString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(formData: FormData, key: string) {
  return readString(formData, key) === "on";
}

function mergeNavItems(kind: "store" | "user", settings: PanelFeatureSettings) {
  const role = kind === "store" ? "seller" : "customer";
  const overrides = new Map(settings.sidebarItems.map((item) => [item.href, item]));

  return dashboardNavigation[role].map((item, index) => {
    const override = overrides.get(item.href);

    return {
      key: item.href.replace(/^\//, "").replace(/\//g, "_") || "home",
      title: override?.title ?? item.title,
      href: item.href,
      icon: item.icon,
      sortOrder: override?.sortOrder ?? index + 1,
      isActive: override?.isActive ?? true,
      showMobile: override?.showMobile ?? true,
      showDesktop: override?.showDesktop ?? true,
      badgeText: override?.badgeText ?? "",
    };
  });
}

export function PanelSettingsForm({ kind, settings }: PanelSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const navItems = useMemo(() => mergeNavItems(kind, settings), [kind, settings]);
  const featureOptions = kind === "store" ? storeFeatures : userFeatures;

  function handleSubmit(formData: FormData) {
    const features = Object.fromEntries(
      featureOptions.map(([key]) => [key, readBoolean(formData, `feature_${key}`)]),
    );
    const sidebarItems = navItems
      .map((item, index) => ({
        key: item.key,
        title: readString(formData, `nav_title_${index}`) || item.title,
        href: item.href,
        icon: item.icon,
        sortOrder: index + 1,
        isActive: readBoolean(formData, `nav_active_${index}`),
        showMobile: readBoolean(formData, `nav_mobile_${index}`),
        showDesktop: readBoolean(formData, `nav_desktop_${index}`),
        badgeText: readString(formData, `nav_badge_${index}`) || undefined,
      }))
      .filter((item) => Boolean(item.href));
    const panelSettings = {
      announcementText: readString(formData, "announcementText"),
      helpText: readString(formData, "helpText"),
      defaultThemeMode: readString(formData, "defaultThemeMode") || "system",
    };

    formData.set("features", JSON.stringify(features));
    formData.set("sidebarItems", JSON.stringify(sidebarItems));
    formData.set("settings", JSON.stringify(panelSettings));

    startTransition(async () => {
      const result = await updatePanelSettingsAction(formData);

      if (!result.ok) {
        await appAlert.error(result.message, "Panel ayarı saxlanmadı");
        return;
      }

      await appAlert.success("Panel ayarı saxlandı", result.message);
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-5">
      <input type="hidden" name="kind" value={kind} />
      <label className="grid gap-2 text-sm font-medium">
        Panel adı
        <input
          name="title"
          defaultValue={settings.title}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <section className="grid gap-3 rounded-md border bg-background p-4">
        <div>
          <h3 className="font-semibold tracking-normal">Funksiyalar</h3>
          <p className="text-sm text-muted-foreground">
            Söndürülən funksiya paneldə bloklanır.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featureOptions.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm font-medium">
              <input
                name={`feature_${key}`}
                type="checkbox"
                defaultChecked={settings.features[key] !== false}
                className="size-4 rounded border-input"
              />
              {label}
            </label>
          ))}
        </div>
      </section>

      <section className="grid gap-3 rounded-md border bg-background p-4">
        <div>
          <h3 className="font-semibold tracking-normal">Sidebar menyusu</h3>
          <p className="text-sm text-muted-foreground">
            Adları dəyişin və mobil/desktop görünüşünü seçin.
          </p>
        </div>
        <div className="grid gap-3">
          {navItems.map((item, index) => (
            <div
              key={item.href}
              className="grid gap-3 rounded-md border bg-card p-3 lg:grid-cols-[1fr_auto]"
            >
              <div className="grid gap-3 md:grid-cols-[1fr_160px]">
                <input
                  name={`nav_title_${index}`}
                  defaultValue={item.title}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <input
                  name={`nav_badge_${index}`}
                  defaultValue={item.badgeText}
                  placeholder="Badge"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    name={`nav_active_${index}`}
                    type="checkbox"
                    defaultChecked={item.isActive}
                    className="size-4 rounded border-input"
                  />
                  Aktiv
                </label>
                <label className="flex items-center gap-2">
                  <input
                    name={`nav_mobile_${index}`}
                    type="checkbox"
                    defaultChecked={item.showMobile}
                    className="size-4 rounded border-input"
                  />
                  Mobil
                </label>
                <label className="flex items-center gap-2">
                  <input
                    name={`nav_desktop_${index}`}
                    type="checkbox"
                    defaultChecked={item.showDesktop}
                    className="size-4 rounded border-input"
                  />
                  Desktop
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 rounded-md border bg-background p-4 lg:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Panel bildirişi
          <input
            name="announcementText"
            defaultValue={String(settings.settings.announcementText ?? "")}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Kömək mətni
          <input
            name="helpText"
            defaultValue={String(settings.settings.helpText ?? "")}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Görünüş rejimi
          <select
            name="defaultThemeMode"
            defaultValue={String(settings.settings.defaultThemeMode ?? "system")}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </section>

      <Button type="submit" className="w-fit" disabled={isPending}>
        {isPending ? "Saxlanılır" : "Saxla"}
      </Button>
    </form>
  );
}
