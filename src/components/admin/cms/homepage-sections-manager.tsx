"use client";

import { Eye, EyeOff, GripVertical, ImagePlus, Monitor, Smartphone } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  reorderHomepageSectionsAction,
  updateHomepageSectionAction,
} from "@/lib/cms/actions";
import type { HomepageSection } from "@/lib/cms/types";
import { appAlert } from "@/lib/alerts/app-alert";
import { cn } from "@/lib/utils";

type HomepageSectionsManagerProps = {
  sections: HomepageSection[];
  stores?: HomepageStoreOption[];
};

type HomepageStoreOption = {
  id: string;
  name: string;
  productCount: number;
};

function shortValue(value: string, fallback: string) {
  return value.trim() || fallback;
}

function stringArraySetting(settings: Record<string, unknown> | null | undefined, key: string) {
  const value = settings?.[key];

  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function mergeSectionSettings(section: HomepageSection | undefined, formData: FormData) {
  if (!section) {
    return;
  }

  let settings = section.settings ?? {};
  const rawSettings = formData.get("settingsJson");

  if (typeof rawSettings === "string" && rawSettings.trim()) {
    try {
      const parsed = JSON.parse(rawSettings) as Record<string, unknown>;
      settings = {
        ...settings,
        ...parsed,
      };
    } catch {
      settings = section.settings ?? {};
    }
  }

  if (section.key === "featured_products") {
    settings = {
      ...settings,
      storeIds: formData
        .getAll("featuredStoreIds")
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .slice(0, 20),
    };
  }

  formData.set("settingsJson", JSON.stringify(settings));
}

export function HomepageSectionsManager({
  sections,
  stores = [],
}: HomepageSectionsManagerProps) {
  const [items, setItems] = useState(sections);
  const [dragId, setDragId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function move(targetId: string) {
    if (!dragId || dragId === targetId) {
      return;
    }

    const from = items.findIndex((item) => item.id === dragId);
    const to = items.findIndex((item) => item.id === targetId);
    const next = [...items];
    const [dragged] = next.splice(from, 1);
    next.splice(to, 0, dragged);
    setItems(next);
  }

  function saveOrder() {
    startTransition(async () => {
      const result = await reorderHomepageSectionsAction(items.map((item) => item.id));

      if (!result.ok) {
        void appAlert.error(result.message, "Sıra saxlanmadı");
        return;
      }

      void appAlert.success("Sıra saxlandı", result.message);
    });
  }

  function handleSectionSubmit(formData: FormData) {
    const sectionId = formData.get("sectionId");
    const section = items.find((item) => item.id === sectionId);

    mergeSectionSettings(section, formData);

    startTransition(async () => {
      const result = await updateHomepageSectionAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Bölmə saxlanmadı");
        return;
      }

      void appAlert.success("Bölmə saxlandı", result.message);
    });
  }

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button type="button" onClick={saveOrder} disabled={isPending}>
          Drag sırasını saxla
        </Button>
      </div>
      {items.map((section) => {
        const selectedStoreIds = stringArraySetting(section.settings, "storeIds");

        return (
          <form
            key={section.id}
            action={handleSectionSubmit}
            draggable
            onDragStart={() => setDragId(section.id)}
            onDragOver={(event) => {
              event.preventDefault();
              move(section.id);
            }}
            onDragEnd={() => setDragId(null)}
            className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm"
          >
          <div className="grid gap-0 xl:grid-cols-[0.92fr_1.08fr]">
            <aside className="border-b bg-muted/25 p-4 xl:border-b-0 xl:border-r xl:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <GripVertical className="size-5 shrink-0 cursor-grab text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Ana səhifə bloku
                    </p>
                    <h3 className="mt-1 truncate text-lg font-black tracking-normal">
                      {section.key}
                    </h3>
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    section.isActive && section.status === "published"
                      ? "bg-primary text-primary-foreground"
                      : "border bg-background text-muted-foreground",
                  )}
                >
                  {section.status}
                </span>
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border bg-background shadow-sm">
                <div className="relative h-36 bg-muted">
                  {section.imageUrl ? (
                    <img
                      src={section.imageUrl}
                      alt={shortValue(section.title, section.key)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center bg-[linear-gradient(135deg,hsl(var(--primary)/0.10),hsl(var(--accent)/0.12))]">
                      <ImagePlus className="size-10 text-muted-foreground" aria-hidden="true" />
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 rounded-lg bg-background/95 px-3 py-2 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Sıra {section.sortOrder}
                    </p>
                    <p className="text-sm font-black">{section.itemLimit || 0} element</p>
                  </div>
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    {section.showTitle ? (
                      <h4 className="line-clamp-2 text-xl font-black tracking-normal">
                        {shortValue(section.title, "Başlıq əlavə edilməyib")}
                      </h4>
                    ) : null}
                    {section.showDescription ? (
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                        {shortValue(section.description, "Açıqlama əlavə edilməyib.")}
                      </p>
                    ) : null}
                    {!section.showTitle && !section.showDescription ? (
                      <p className="text-sm font-semibold text-muted-foreground">
                        Başlıq və açıqlama gizlidir.
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                      {shortValue(section.buttonLabel, "Düymə mətni")}
                    </span>
                    <span className="rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                      {shortValue(section.dataFilter, "manual")}
                    </span>
                    <span className="rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                      {shortValue(section.themeVariant, "default")}
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold",
                        section.showMobile
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Smartphone className="size-4" aria-hidden="true" />
                      Mobil {section.showMobile ? "görünür" : "gizlidir"}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold",
                        section.showDesktop
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Monitor className="size-4" aria-hidden="true" />
                      Desktop {section.showDesktop ? "görünür" : "gizlidir"}
                    </span>
                  </div>
                </div>
              </div>
            </aside>

            <div className="grid gap-4 p-4 xl:p-5">
              <input type="hidden" name="sectionId" value={section.id} />
              <input
                type="hidden"
                name="settingsJson"
                value={JSON.stringify(section.settings ?? {})}
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <input
                  name="title"
                  defaultValue={section.title}
                  placeholder="Başlıq"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <input
                  name="imageUrl"
                  defaultValue={section.imageUrl}
                  placeholder="Şəkil URL"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-muted/20 px-4 py-3 text-center text-sm transition hover:border-primary/40 hover:bg-primary/5">
                  <ImagePlus className="size-6 text-primary" aria-hidden="true" />
                  <span className="font-semibold">Bölmə şəklini seç</span>
                  <span className="text-xs text-muted-foreground">Şəkil faylı, maksimum 5MB</span>
                  <input
                    name="imageFile"
                    type="file"
                    accept="image/*,.heic,.heif,.avif,.tif,.tiff,.bmp"
                    className="sr-only"
                  />
                </label>
                <input
                  name="buttonLabel"
                  defaultValue={section.buttonLabel}
                  placeholder="Düymə mətni"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <input
                  name="buttonUrl"
                  defaultValue={section.buttonUrl}
                  placeholder="Düymə linki"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <input
                  name="dataFilter"
                  defaultValue={section.dataFilter}
                  placeholder="Data filter"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <input
                  name="themeVariant"
                  defaultValue={section.themeVariant}
                  placeholder="Tema variantı"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <textarea
                name="description"
                defaultValue={section.description}
                placeholder="Açıqlama"
                className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {section.key === "featured_products" && stores.length > 0 ? (
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black">Əsas ekranda görünən mağazalar</h4>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Mobildə ilk 4 seçilmiş mağaza görünür. Sıra seçdiyiniz mağazaların
                        əlifba sırasına görə saxlanır.
                      </p>
                    </div>
                    <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
                      {selectedStoreIds.length} seçilib
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {stores.map((store) => (
                      <label
                        key={store.id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border bg-background px-3 py-2 text-sm transition hover:border-primary/40"
                      >
                        <input
                          name="featuredStoreIds"
                          type="checkbox"
                          value={store.id}
                          defaultChecked={selectedStoreIds.includes(store.id)}
                          className="size-4 rounded border-input"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{store.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {store.productCount} məhsul
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <input
                  name="itemLimit"
                  type="number"
                  min="0"
                  defaultValue={section.itemLimit}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <input
                  name="sortOrder"
                  type="number"
                  defaultValue={section.sortOrder}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <select
                  name="status"
                  defaultValue={section.status}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                {[
                  {
                    name: "isActive",
                    label: "Aktiv",
                    checked: section.isActive,
                    icon: Eye,
                  },
                  {
                    name: "showMobile",
                    label: "Mobil göstər",
                    checked: section.showMobile,
                    icon: Smartphone,
                  },
                  {
                    name: "showDesktop",
                    label: "Desktop göstər",
                    checked: section.showDesktop,
                    icon: Monitor,
                  },
                  {
                    name: "showTitle",
                    label: "Başlığı göstər",
                    checked: section.showTitle,
                    icon: Eye,
                  },
                  {
                    name: "showDescription",
                    label: "Açıqlamanı göstər",
                    checked: section.showDescription,
                    icon: Eye,
                  },
                ].map((item) => {
                  const ToggleIcon = item.checked ? item.icon : EyeOff;

                  return (
                    <label
                      key={item.name}
                      className="group cursor-pointer"
                    >
                      <input
                        name={item.name}
                        type="checkbox"
                        defaultChecked={item.checked}
                        className="peer sr-only"
                      />
                      <span className="inline-flex min-h-10 items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-semibold text-muted-foreground transition peer-checked:border-primary/40 peer-checked:bg-primary/10 peer-checked:text-primary group-hover:border-primary/30">
                        <ToggleIcon className="size-4" aria-hidden="true" />
                        {item.label}
                      </span>
                    </label>
                  );
                })}
              </div>
              <Button type="submit" className="w-fit" disabled={isPending}>
                Bölməni saxla
              </Button>
            </div>
          </div>
        </form>
        );
      })}
    </div>
  );
}
