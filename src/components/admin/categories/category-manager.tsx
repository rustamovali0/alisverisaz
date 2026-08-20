"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/lib/categories/actions";
import type { AdminCategory } from "@/lib/categories/data";
import { appAlert } from "@/lib/alerts/app-alert";

type CategoryManagerProps = {
  categories: AdminCategory[];
};

function CategoryParentSelect({
  categories,
  currentId,
  defaultValue,
}: {
  categories: AdminCategory[];
  currentId?: string;
  defaultValue?: string | null;
}) {
  return (
    <select
      name="parentId"
      defaultValue={defaultValue ?? ""}
      className="h-11 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
    >
      <option value="">Ana kateqoriya</option>
      {categories
        .filter((category) => category.id !== currentId)
        .map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
    </select>
  );
}

export function CategoryManager({ categories }: CategoryManagerProps) {
  const [isPending, startTransition] = useTransition();

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      const result = await createCategoryAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Kateqoriya yaradılmadı");
        return;
      }

      void appAlert.success("Kateqoriya yaradıldı", result.message);
    });
  }

  function handleUpdate(formData: FormData) {
    startTransition(async () => {
      const result = await updateCategoryAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Kateqoriya yenilənmədi");
        return;
      }

      void appAlert.success("Kateqoriya yeniləndi", result.message);
    });
  }

  function handleDelete(formData: FormData) {
    startTransition(async () => {
      const confirmation = await appAlert.confirm({
        title: "Kateqoriya silinsin?",
        message:
          "Bu əməliyyat kateqoriyanı siləcək. Məhsulların kateqoriya bağlantısı boş qala bilər.",
        confirmText: "Sil",
        cancelText: "Ləğv et",
        variant: "danger",
      });

      if (!confirmation.isConfirmed) {
        return;
      }

      const result = await deleteCategoryAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Kateqoriya silinmədi");
        return;
      }

      void appAlert.success("Kateqoriya silindi", result.message);
    });
  }

  return (
    <div className="grid gap-5">
      <form
        action={handleCreate}
        className="grid gap-4 rounded-lg border bg-card p-4 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black tracking-normal">Yeni kateqoriya</h2>
            <p className="text-sm text-muted-foreground">
              Ana və alt kateqoriyaları buradan yaradın.
            </p>
          </div>
          <Button type="submit" disabled={isPending}>
            <Plus className="mr-2 size-4" aria-hidden="true" />
            Yarat
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_160px_180px_auto]">
          <input
            name="name"
            required
            placeholder="Kateqoriya adı"
            className="h-11 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          <input
            name="slug"
            placeholder="slug"
            className="h-11 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          <input
            name="sortOrder"
            type="number"
            defaultValue={0}
            className="h-11 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          <CategoryParentSelect categories={categories} />
          <label className="flex h-11 items-center gap-2 rounded-md border bg-background px-3 text-sm">
            <input name="isActive" type="checkbox" defaultChecked />
            Aktiv
          </label>
        </div>
        <textarea
          name="description"
          placeholder="Açıqlama"
          className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        <label className="grid gap-2 text-sm font-medium">
          Şəkil
          <input
            name="imageFile"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="h-11 rounded-md border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
          />
        </label>
      </form>

      <div className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-black tracking-normal">Kateqoriyalar</h2>
          <p className="text-sm text-muted-foreground">
            Ad, slug, sıra, status və parent bağlantısını dəyişin.
          </p>
        </div>
        <div className="grid gap-3">
          {categories.map((category) => (
            <form
              key={category.id}
              action={handleUpdate}
              className="grid gap-3 rounded-lg border bg-background p-3 lg:grid-cols-[72px_1fr_1fr_120px_180px_120px_auto]"
            >
              <input type="hidden" name="categoryId" value={category.id} />
              <div className="h-16 w-16 overflow-hidden rounded-md border bg-card">
                {category.imageUrl ? (
                  <img
                    src={category.imageUrl}
                    alt={category.name}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <input
                name="name"
                defaultValue={category.name}
                required
                className="h-11 min-w-0 rounded-md border bg-card px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
              <input
                name="slug"
                defaultValue={category.slug}
                className="h-11 min-w-0 rounded-md border bg-card px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
              <input
                name="sortOrder"
                type="number"
                defaultValue={category.sortOrder}
                className="h-11 min-w-0 rounded-md border bg-card px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
              <CategoryParentSelect
                categories={categories}
                currentId={category.id}
                defaultValue={category.parentId}
              />
              <label className="flex h-11 items-center gap-2 rounded-md border bg-card px-3 text-sm">
                <input name="isActive" type="checkbox" defaultChecked={category.isActive} />
                Aktiv
              </label>
              <div className="flex gap-2">
                <Button type="submit" disabled={isPending} className="flex-1">
                  <Save className="mr-2 size-4" aria-hidden="true" />
                  Saxla
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  formAction={handleDelete}
                  disabled={isPending}
                  aria-label={`${category.name} kateqoriyasını sil`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
              <textarea
                name="description"
                defaultValue={category.description ?? ""}
                placeholder="Açıqlama"
                className="min-h-16 rounded-md border bg-card px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 lg:col-span-full"
              />
              <label className="grid gap-2 text-sm font-medium lg:col-span-full">
                Şəkli dəyiş
                <input
                  name="imageFile"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="h-11 rounded-md border bg-card px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
                />
              </label>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
