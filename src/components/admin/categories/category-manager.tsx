"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/lib/categories/actions";
import type { AdminCategory } from "@/lib/categories/data";
import { getCategoryImage } from "@/lib/categories/images";
import { matchesAdminSearch } from "@/lib/dashboard/admin-search";
import { appAlert } from "@/lib/alerts/app-alert";

export function CategoryManager({
  categories,
}: {
  categories: AdminCategory[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const parents = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );
  const filtered = categories.filter((c) =>
    matchesAdminSearch(query, [c.name, c.slug, parents.get(c.parentId || "")]),
  );
  function submit(action: typeof createCategoryAction, form: FormData) {
    startTransition(async () => {
      const result = await action(form);
      if (!result.ok) {
        void appAlert.error(result.message, "Əməliyyat alınmadı");
        return;
      }
      router.refresh();
      void appAlert.success("Saxlanıldı", result.message);
    });
  }
  function remove(form: FormData) {
    startTransition(async () => {
      const yes = await appAlert.confirm({
        title: "Kateqoriya silinsin?",
        message: "Məhsulların bu kateqoriya ilə əlaqəsi boş qala bilər.",
        confirmText: "Sil",
        cancelText: "Ləğv et",
        variant: "danger",
      });
      if (!yes.isConfirmed) return;
      const result = await deleteCategoryAction(form);
      if (!result.ok) {
        void appAlert.error(result.message, "Silinmədi");
        return;
      }
      router.refresh();
      void appAlert.success("Silindi", result.message);
    });
  }
  function fields(category?: AdminCategory) {
    return (
      <>
        {category && (
          <input type="hidden" name="categoryId" value={category.id} />
        )}
        <div className="ra-form-grid">
          <label className="ra-field">
            Ad
            <input name="name" required defaultValue={category?.name} />
          </label>
          <label className="ra-field">
            Ünvan adı (slug)
            <input
              name="slug"
              defaultValue={category?.slug}
              placeholder="Avtomatik yaradıla bilər"
            />
          </label>
          <label className="ra-field">
            Ana kateqoriya
            <select name="parentId" defaultValue={category?.parentId || ""}>
              <option value="">Əsas kateqoriya</option>
              {categories
                .filter((c) => c.id !== category?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="ra-field">
            Sıra
            <input
              name="sortOrder"
              type="number"
              defaultValue={category?.sortOrder ?? 0}
            />
          </label>
        </div>
        <label className="ra-field">
          Açıqlama
          <textarea
            name="description"
            defaultValue={category?.description || ""}
          />
        </label>
        <label className="ra-field">
          Şəkil
          <input
            type="file"
            name="imageFile"
            accept="image/*,.heic,.heif,.avif,.tif,.tiff,.bmp"
          />
        </label>
        {category?.imageUrl && (
          <label className="flex items-center gap-2">
            <input type="checkbox" name="removeImage" />
            Şəkli sil
          </label>
        )}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={category?.isActive ?? true}
          />
          Aktivdir
        </label>
      </>
    );
  }
  return (
    <div className="grid gap-5">
      <div className="ra-section-toolbar">
        <input
          type="search"
          aria-label="Kateqoriyalarda axtar"
          placeholder="Kateqoriya axtar..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="text-sm text-muted-foreground">
          {filtered.length} / {categories.length}
        </span>
      </div>
      <details className="rounded-lg border bg-card">
        <summary className="cursor-pointer p-4 font-semibold">
          + Yeni kateqoriya
        </summary>
        <form
          action={(form) => submit(createCategoryAction, form)}
          className="grid gap-4 p-4 pt-0"
        >
          {fields()}
          <Button disabled={pending} type="submit" className="w-fit">
            Kateqoriya yarat
          </Button>
        </form>
      </details>
      <div className="ra-editor-list">
        {filtered.map((category) => (
          <details
            key={category.id}
            open={editingId === category.id}
            onToggle={(event) => {
              if (event.currentTarget.open) setEditingId(category.id);
              else
                setEditingId((current) =>
                  current === category.id ? null : current,
                );
            }}
          >
            <summary>
              <span className="inline-flex items-center gap-3">
                {getCategoryImage(category) && (
                  <img
                    src={getCategoryImage(category)!}
                    alt=""
                    className="size-10 rounded-md object-cover"
                  />
                )}
                <span>
                  {category.name}
                  <small className="ml-3 font-normal text-muted-foreground">
                    {category.parentId
                      ? parents.get(category.parentId)
                      : "Əsas kateqoriya"}{" "}
                    · {category.isActive ? "Aktiv" : "Gizli"}
                  </small>
                </span>
              </span>
            </summary>
            {editingId === category.id && (
              <form
                action={(form) => submit(updateCategoryAction, form)}
                className="ra-editor-body grid gap-4"
              >
                {fields(category)}
                <div className="flex flex-wrap gap-3">
                  <Button disabled={pending} type="submit">
                    Yadda saxla
                  </Button>
                  <Button
                    disabled={pending}
                    type="submit"
                    formAction={remove}
                    variant="outline"
                  >
                    Kateqoriyanı sil
                  </Button>
                </div>
              </form>
            )}
          </details>
        ))}
        {!filtered.length && (
          <p className="p-5 text-muted-foreground" role="status">
            Uyğun kateqoriya tapılmadı.
          </p>
        )}
      </div>
    </div>
  );
}
