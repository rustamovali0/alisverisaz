"use client";

import { GripVertical } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  reorderHomepageSectionsAction,
  updateHomepageSectionAction,
} from "@/lib/cms/actions";
import type { HomepageSection } from "@/lib/cms/types";
import { appAlert } from "@/lib/alerts/app-alert";

type HomepageSectionsManagerProps = {
  sections: HomepageSection[];
};

export function HomepageSectionsManager({ sections }: HomepageSectionsManagerProps) {
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
      {items.map((section) => (
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
          className="grid gap-4 rounded-md border bg-card p-4 text-card-foreground shadow-sm"
        >
          <input type="hidden" name="sectionId" value={section.id} />
          <div className="flex items-center gap-3">
            <GripVertical className="size-5 cursor-grab text-muted-foreground" />
            <div>
              <h3 className="font-semibold tracking-normal">{section.key}</h3>
              <p className="text-sm text-muted-foreground">
                Sıra: {section.sortOrder} · {section.status}
              </p>
            </div>
          </div>
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
            className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
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
          <div className="flex flex-wrap gap-4 text-sm">
            {[
              ["isActive", "Aktiv", section.isActive],
              ["showMobile", "Mobil", section.showMobile],
              ["showDesktop", "Desktop", section.showDesktop],
            ].map(([name, label, checked]) => (
              <label key={String(name)} className="flex items-center gap-2">
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
          <Button type="submit" className="w-fit" disabled={isPending}>
            Bölməni saxla
          </Button>
        </form>
      ))}
    </div>
  );
}
