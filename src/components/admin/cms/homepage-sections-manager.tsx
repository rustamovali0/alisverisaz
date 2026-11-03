"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  reorderHomepageSectionsAction,
  updateHomepageSectionAction,
} from "@/lib/cms/actions";
import type { HomepageSection } from "@/lib/cms/types";
import {
  heroPresentation,
  homeSectionLabels,
} from "@/lib/cms/home-presentation";
import { appAlert } from "@/lib/alerts/app-alert";
type StoreOption = { id: string; name: string; productCount: number };
export function HomepageSectionsManager({
  sections,
  stores = [],
}: {
  sections: HomepageSection[];
  stores?: StoreOption[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(sections);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  useEffect(() => setItems(sections), [sections]);
  function move(index: number, step: number) {
    const to = index + step;
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    [next[index], next[to]] = [next[to], next[index]];
    setItems(next.map((s, i) => ({ ...s, sortOrder: i + 1 })));
    setDirty(true);
  }
  function saveOrder() {
    startTransition(async () => {
      const r = await reorderHomepageSectionsAction(items.map((s) => s.id));
      if (!r.ok) {
        void appAlert.error(r.message, "Saxlanmadı");
        return;
      }
      setDirty(false);
      router.refresh();
      void appAlert.success("Sıra saxlandı", r.message);
    });
  }
  function save(form: FormData) {
    const section = items.find((s) => s.id === form.get("sectionId"));
    if (!section) return;
    const settings = { ...section.settings };
    if (section.key === "featured_products")
      settings.storeIds = form
        .getAll("featuredStoreIds")
        .filter((v) => typeof v === "string")
        .slice(0, 20);
    form.set("settingsJson", JSON.stringify(settings));
    startTransition(async () => {
      const r = await updateHomepageSectionAction(form);
      if (!r.ok) {
        void appAlert.error(r.message, "Saxlanmadı");
        return;
      }
      router.refresh();
      void appAlert.success("Bölmə saxlandı", r.message);
    });
  }
  return (
    <div className="grid gap-5">
      <div className="ra-section-toolbar">
        <p className="text-muted-foreground">
          Bölməni açıb mətnini və görünüşünü dəyişin.
        </p>
        <Button type="button" onClick={saveOrder} disabled={pending || !dirty}>
          Sıralamanı saxla
        </Button>
      </div>
      <div className="ra-editor-list">
        {items.map((section, index) => {
          const hero = heroPresentation(section);
          const isHero = section.key === "hero";
          const selected = Array.isArray(section.settings.storeIds)
            ? section.settings.storeIds
            : [];
          return (
            <details key={section.id}>
              <summary>
                <span className="inline-flex flex-wrap items-center gap-3">
                  <span className="text-muted-foreground">{index + 1}.</span>
                  {homeSectionLabels[section.key] || section.key}
                  <span className="text-sm font-normal text-muted-foreground">
                    {section.isActive && section.status === "published"
                      ? "Görünür"
                      : "Gizlidir"}
                  </span>
                </span>
              </summary>
              <div className="ra-editor-body">
                <div className="mb-4 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => move(index, -1)}
                    disabled={index === 0 || pending}
                    aria-label="Bölməni yuxarı çək"
                  >
                    ↑ Yuxarı
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1 || pending}
                    aria-label="Bölməni aşağı çək"
                  >
                    ↓ Aşağı
                  </Button>
                </div>
                <form action={save} className="grid gap-4">
                  <input type="hidden" name="sectionId" value={section.id} />
                  <input
                    type="hidden"
                    name="sortOrder"
                    value={section.sortOrder}
                  />
                  <input
                    type="hidden"
                    name="dataFilter"
                    value={section.dataFilter}
                  />
                  <input
                    type="hidden"
                    name="themeVariant"
                    value={section.themeVariant}
                  />
                  {isHero && (
                    <div className="overflow-hidden rounded-lg border bg-muted">
                      <img
                        src={hero.imageUrl}
                        alt="Bannerin hazırkı görünüşü"
                        className="max-h-48 w-full object-cover"
                      />
                      <div className="p-4">
                        <strong>{hero.title}</strong>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {hero.description}
                        </p>
                      </div>
                    </div>
                  )}
                  <label className="ra-field">
                    Başlıq
                    <input
                      name="title"
                      defaultValue={isHero ? hero.title : section.title}
                    />
                  </label>
                  <label className="ra-field">
                    Qısa mətn
                    <textarea
                      name="description"
                      defaultValue={
                        isHero ? hero.description : section.description
                      }
                    />
                  </label>
                  <div className="ra-form-grid">
                    <label className="ra-field">
                      Düymə yazısı
                      <input
                        name="buttonLabel"
                        defaultValue={section.buttonLabel}
                      />
                    </label>
                    <label className="ra-field">
                      Düymə keçidi
                      <input
                        name="buttonUrl"
                        defaultValue={section.buttonUrl}
                      />
                    </label>
                  </div>
                  <input
                    type="hidden"
                    name="imageUrl"
                    value={section.imageUrl}
                  />
                  <input
                    type="hidden"
                    name="mobileImageUrl"
                    value={
                      typeof section.settings.mobileImageUrl === "string"
                        ? section.settings.mobileImageUrl
                        : ""
                    }
                  />
                  {isHero && (
                    <div className="ra-form-grid">
                      <label className="ra-field">
                        Banner şəkli
                        <input
                          name="imageFile"
                          type="file"
                          accept="image/*,.heic,.heif,.avif,.tif,.tiff,.bmp"
                        />
                      </label>
                      <label className="ra-field">
                        Mobil banner (istəyə görə)
                        <input
                          name="mobileImageFile"
                          type="file"
                          accept="image/*,.heic,.heif,.avif,.tif,.tiff,.bmp"
                        />
                      </label>
                    </div>
                  )}
                  {section.key === "featured_products" && (
                    <details>
                      <summary className="cursor-pointer py-3">
                        Göstəriləcək mağazalar ({selected.length || "avtomatik"}
                        )
                      </summary>
                      <p className="my-3 text-sm text-muted-foreground">
                        Seçim etməsəniz uyğun mağazalar avtomatik göstərilir.
                      </p>
                      <div className="ra-form-grid">
                        {stores.map((store) => (
                          <label
                            key={store.id}
                            className="flex items-center gap-2"
                          >
                            <input
                              name="featuredStoreIds"
                              type="checkbox"
                              value={store.id}
                              defaultChecked={selected.includes(store.id)}
                            />
                            {store.name}{" "}
                            <small className="text-muted-foreground">
                              {store.productCount} məhsul
                            </small>
                          </label>
                        ))}
                      </div>
                    </details>
                  )}
                  <details>
                    <summary className="cursor-pointer py-3">
                      Görünüş seçimləri
                    </summary>
                    <div className="grid gap-3 py-3">
                      <div className="ra-form-grid">
                        <label className="ra-field">
                          Element sayı
                          <input
                            type="number"
                            name="itemLimit"
                            min="1"
                            max="24"
                            defaultValue={section.itemLimit}
                          />
                        </label>
                        <label className="ra-field">
                          Yayım
                          <select name="status" defaultValue={section.status}>
                            <option value="published">Yayımlansın</option>
                            <option value="draft">Qaralama</option>
                            <option value="archived">Arxiv</option>
                          </select>
                        </label>
                      </div>
                      {[
                        ["isActive", "Bölmə aktivdir", section.isActive],
                        ["showMobile", "Mobildə göstər", section.showMobile],
                        [
                          "showDesktop",
                          "Kompüterdə göstər",
                          section.showDesktop,
                        ],
                        ["showTitle", "Başlığı göstər", section.showTitle],
                        [
                          "showDescription",
                          "Mətni göstər",
                          section.showDescription,
                        ],
                      ].map(([name, label, checked]) => (
                        <label
                          key={String(name)}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="checkbox"
                            name={String(name)}
                            defaultChecked={Boolean(checked)}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </details>
                  <Button type="submit" disabled={pending} className="w-fit">
                    Yadda saxla
                  </Button>
                </form>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
