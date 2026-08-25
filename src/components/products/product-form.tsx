"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";

import { ImageDropzone } from "@/components/products/image-dropzone";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import {
  createPersonalListingAction,
  createStoreProductAction,
  updateProductAction,
} from "@/lib/products/actions";
import type {
  ProductLocationAvailability,
  StoreLocation,
} from "@/lib/locations/types";
import type {
  CategoryOption,
  ManagedProduct,
  ProductOptionInput,
  ProductOptionType,
} from "@/lib/products/types";
import {
  getEnabledProductOptions,
  normalizeProductOptions,
} from "@/lib/products/variant-utils";

type ProductFormMode = "store-create" | "personal-create" | "edit";

type ProductFormProps = {
  mode: ProductFormMode;
  categories: CategoryOption[];
  stores?: Array<{
    id: string;
    name: string;
  }>;
  product?: ManagedProduct;
  locations?: StoreLocation[];
  productLocations?: ProductLocationAvailability[];
  disabled?: boolean;
  imageLimit?: number | null;
  successRedirect?: string;
};

function variantsToText(product?: ManagedProduct) {
  return (product?.variants ?? [])
    .map(
      (variant) =>
        `${variant.name}|${variant.value}|${variant.priceDeltaAmount}|${variant.stockQuantity}`,
    )
    .join("\n");
}

function optionFallbackLabel(type: ProductOptionType) {
  if (type === "color") {
    return "Rəng";
  }

  if (type === "size") {
    return "Ölçü";
  }

  return type === "custom1" ? "Custom seçim 1" : "Custom seçim 2";
}

function getInitialOptions(product?: ManagedProduct) {
  const normalized = normalizeProductOptions(product?.options ?? []);

  if (getEnabledProductOptions(normalized).length > 0) {
    return normalized;
  }

  const legacyGroups = new Map<string, string[]>();

  (product?.variants ?? []).forEach((variant) => {
    const values = legacyGroups.get(variant.name) ?? [];

    if (variant.value && !values.includes(variant.value)) {
      values.push(variant.value);
    }

    legacyGroups.set(variant.name, values);
  });

  if (legacyGroups.size === 0) {
    return normalized;
  }

  const firstLegacy = Array.from(legacyGroups.entries())[0];

  return normalized.map((option) =>
    option.type === "custom1"
      ? {
          ...option,
          name: firstLegacy[0],
          isEnabled: true,
          values: firstLegacy[1].map((value, index) => ({
            value,
            sortOrder: index,
          })),
        }
      : option,
  );
}

function dedupeOptionValues(values: ProductOptionInput["values"]) {
  const seen = new Set<string>();

  return values.filter((item) => {
    const key = item.value.trim().toLocaleLowerCase("az");

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function ProductVariantEditor({
  product,
  disabled,
}: {
  product?: ManagedProduct;
  disabled?: boolean;
}) {
  const [options, setOptions] = useState<ProductOptionInput[]>(() =>
    getInitialOptions(product),
  );
  const variantConfig = useMemo(
    () =>
      JSON.stringify({
        options: options.map((option) => ({
          ...option,
          values: dedupeOptionValues(option.values),
        })),
        combinations: product?.variantCombinations ?? [],
      }),
    [options, product?.variantCombinations],
  );

  function updateOption(type: ProductOptionType, next: Partial<ProductOptionInput>) {
    setOptions((current) =>
      current.map((option) =>
        option.type === type
          ? {
              ...option,
              ...next,
            }
          : option,
      ),
    );
  }

  function updateOptionValue(
    type: ProductOptionType,
    index: number,
    key: "value" | "colorHex",
    value: string,
  ) {
    setOptions((current) =>
      current.map((option) =>
        option.type === type
          ? {
              ...option,
              values: option.values.map((item, itemIndex) =>
                itemIndex === index ? { ...item, [key]: value } : item,
              ),
            }
          : option,
      ),
    );
  }

  function addOptionValue(type: ProductOptionType) {
    setOptions((current) =>
      current.map((option) =>
        option.type === type
          ? {
              ...option,
              values: [
                ...option.values,
                {
                  value: "",
                  colorHex: type === "color" ? "#111827" : null,
                  sortOrder: option.values.length,
                },
              ],
            }
          : option,
      ),
    );
  }

  function removeOptionValue(type: ProductOptionType, index: number) {
    setOptions((current) =>
      current.map((option) =>
        option.type === type
          ? {
              ...option,
              values: option.values.filter((_, itemIndex) => itemIndex !== index),
            }
          : option,
      ),
    );
  }

  return (
    <div className="grid gap-4 rounded-md border bg-background p-4">
      <input type="hidden" name="variantConfig" value={variantConfig} />
      <textarea name="variants" value={variantsToText(product)} readOnly hidden />
      <div>
        <p className="text-sm font-semibold">Məhsul variantları</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Seçim yoxdursa public səhifədə görünmür. Bir seçim varsa avtomatik
          seçilir.
        </p>
      </div>
      <div className="grid gap-3">
        {options.map((option) => (
          <div key={option.type} className="rounded-md border bg-card p-3">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={option.isEnabled}
                disabled={disabled}
                onChange={(event) =>
                  updateOption(option.type, {
                    isEnabled: event.target.checked,
                    name: option.name || optionFallbackLabel(option.type),
                  })
                }
                className="size-4 rounded border-input"
              />
              {optionFallbackLabel(option.type)}
            </label>
            {option.isEnabled ? (
              <div className="mt-3 grid gap-3">
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                  Seçim adı
                  <input
                    value={option.name}
                    onChange={(event) =>
                      updateOption(option.type, { name: event.target.value })
                    }
                    disabled={disabled || option.type === "color" || option.type === "size"}
                    placeholder={optionFallbackLabel(option.type)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-70"
                  />
                </label>
                <div className="grid gap-2">
                  {option.values.map((value, index) => (
                    <div
                      key={`${option.type}-${index}`}
                      className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
                    >
                      {option.type === "color" ? (
                        <input
                          type="color"
                          value={value.colorHex ?? "#111827"}
                          onChange={(event) =>
                            updateOptionValue(
                              option.type,
                              index,
                              "colorHex",
                              event.target.value,
                            )
                          }
                          disabled={disabled}
                          className="size-9 rounded-md border border-input bg-background p-1"
                          aria-label="Rəng kodu"
                        />
                      ) : (
                        <span className="hidden sm:block" />
                      )}
                      <input
                        value={value.value}
                        onChange={(event) =>
                          updateOptionValue(option.type, index, "value", event.target.value)
                        }
                        disabled={disabled}
                        placeholder={
                          option.type === "color"
                            ? "Qara"
                            : option.type === "size"
                              ? "M"
                              : "Dəyər"
                        }
                        className="h-9 min-w-0 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeOptionValue(option.type, index)}
                        disabled={disabled}
                      >
                        Sil
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit"
                  onClick={() => addOptionValue(option.type)}
                  disabled={disabled}
                >
                  Dəyər əlavə et
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function getButtonLabel(mode: ProductFormMode, isPending: boolean) {
  if (isPending) {
    return "Yadda saxlanılır";
  }

  if (mode === "edit") {
    return "Yenilə";
  }

  if (mode === "personal-create") {
    return "Elan yerləşdir";
  }

  return "Məhsul əlavə et";
}

export function ProductForm({
  mode,
  categories,
  stores = [],
  product,
  locations = [],
  productLocations = [],
  disabled = false,
  imageLimit = 5,
  successRedirect,
}: ProductFormProps) {
  const [isPending, startTransition] = useTransition();
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const router = useRouter();
  const selectedLocationMap = new Map(
    productLocations.map((item) => [item.locationId, item]),
  );
  const showLocationSection = mode !== "personal-create" && locations.length > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.delete("images");
    imageFiles.forEach((file) => {
      formData.append("images", file);
    });

    startTransition(async () => {
      const result =
        mode === "store-create"
          ? await createStoreProductAction(formData)
          : mode === "personal-create"
            ? await createPersonalListingAction(formData)
            : await updateProductAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Əməliyyat alınmadı");
        return;
      }

      void appAlert.success("Uğurludur", result.message);
      setImageFiles([]);

      if (successRedirect) {
        router.replace(successRedirect);
        router.refresh();
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid min-w-0 gap-4 overflow-hidden rounded-md border bg-card p-4 text-card-foreground shadow-sm [&_input]:min-w-0 [&_select]:min-w-0 [&_select]:w-full [&_textarea]:min-w-0 [&_textarea]:w-full"
    >
      {product ? <input type="hidden" name="productId" value={product.id} /> : null}
      {mode === "store-create" ? (
        <label className="grid gap-2 text-sm font-medium">
          Mağaza
          <select
            name="storeId"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
            disabled={disabled || stores.length === 0}
          >
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <label className="grid min-w-0 gap-2 text-sm font-medium">
          Ad
          <input
            name="name"
            defaultValue={product?.name}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
            disabled={disabled}
          />
        </label>
        <label className="grid min-w-0 gap-2 text-sm font-medium">
          Kateqoriya
          <select
            name="categoryId"
            defaultValue={product?.categoryId ?? ""}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={disabled}
          >
            <option value="">Kateqoriyasız</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="grid gap-2 text-sm font-medium">
          Stok sayı
          <input
            name="stockQuantity"
            type="number"
            min="0"
            step="1"
            defaultValue={product?.stockQuantity ?? undefined}
            placeholder="Stok sayı"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
            disabled={disabled}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Maya dəyəri
          <input
            name="costAmount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={product?.costAmount ?? undefined}
            placeholder="Maya dəyəri"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={disabled}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Əsas qiymət
          <input
            name="priceAmount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={product?.priceAmount ?? undefined}
            placeholder="Əsas qiymət"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
            disabled={disabled}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Endirimli qiymət
          <input
            name="discountedPriceAmount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={
              product
                ? Math.max(product.priceAmount - product.discountAmount, 0)
                : undefined
            }
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={disabled}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Status
          <select
            name="status"
            defaultValue={product?.status ?? "active"}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={disabled}
          >
            <option value="draft">Qaralama</option>
            <option value="active">Aktiv</option>
            <option value="archived">Arxiv</option>
          </select>
        </label>
      </div>

      <label className="grid gap-2 text-sm font-medium">
        Açıqlama
        <textarea
          name="description"
          defaultValue={product?.description ?? ""}
          className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          disabled={disabled}
        />
      </label>

      <div className="grid gap-4 rounded-md border bg-background p-4">
        <p className="text-sm font-medium">SEO məlumatları</p>
        <div className="grid gap-4">
          <input
            name="seo_title_az"
            placeholder="SEO başlıq"
            defaultValue={product?.seoTitleTranslations.az ?? ""}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={disabled}
          />
          <textarea
            name="seo_description_az"
            placeholder="SEO açıqlama"
            defaultValue={product?.seoDescriptionTranslations.az ?? ""}
            className="min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={disabled}
          />
        </div>
      </div>

      <input type="hidden" name="depositEnabled" value="off" />
      <input type="hidden" name="depositType" value="fixed" />
      <input type="hidden" name="depositValue" value="0" />

      <ProductVariantEditor product={product} disabled={disabled} />

      {showLocationSection ? (
        <div className="grid gap-4 rounded-md border bg-background p-4">
          <div>
            <p className="text-sm font-medium">Satış nöqtələri və mövcudluq</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Məhsulun göründüyü filialları və həmin filialdakı stoku seçin.
            </p>
          </div>
          <div className="grid gap-3">
            {locations.map((location) => {
              const selected = selectedLocationMap.get(location.id);

              return (
                <div
                  key={location.id}
                  className="grid gap-3 rounded-md border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_140px]"
                >
                  <label className="flex min-w-0 items-start gap-3 text-sm font-medium">
                    <input
                      name="productLocationIds"
                      type="checkbox"
                      value={location.id}
                      defaultChecked={Boolean(selected)}
                      disabled={disabled}
                      className="mt-1 size-4 rounded border-input"
                    />
                    <span className="min-w-0">
                      <span className="block truncate">{location.name}</span>
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">
                        {location.storeName ? `${location.storeName} · ` : ""}
                        {location.city}
                        {location.district ? `, ${location.district}` : ""}
                      </span>
                    </span>
                  </label>
                  <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                    Bu nöqtədə stok
                    <input
                      name={`locationStock:${location.id}`}
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={selected?.stockQuantity ?? undefined}
                      placeholder="Stok"
                      disabled={disabled}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <label className="grid gap-2 text-sm font-medium">
        Şəkillər
        <ImageDropzone
          files={imageFiles}
          onFilesChange={setImageFiles}
          disabled={disabled}
          maxFiles={imageLimit}
        />
        <span className="text-xs font-medium text-muted-foreground">
          {imageLimit === null
            ? "Şəkil limiti limitsizdir."
            : `Maksimum ${imageLimit} şəkil`}
        </span>
      </label>

      {mode === "personal-create" ? (
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          Fərdi elan yaradıldıqdan sonra 1 AZN ödəniş tələb olunur.
          Real ödəniş təsdiqlənəndən sonra elan aktivləşir.
        </p>
      ) : null}

      <Button type="submit" disabled={disabled || isPending}>
        {getButtonLabel(mode, isPending)}
      </Button>
    </form>
  );
}
