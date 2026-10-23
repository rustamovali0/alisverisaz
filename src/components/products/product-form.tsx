"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Heading2, List, ListOrdered, Pilcrow, Sparkles } from "lucide-react";

import { ImageDropzone } from "@/components/products/image-dropzone";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import {
  createPersonalListingAction,
  createStoreProductAction,
  deleteProductImageAction,
  setPrimaryProductImageAction,
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
  standalone?: boolean;
  profitTrackingEnabled?: boolean;
};

const CATEGORY_KEYWORD_GROUPS = [
  { category: ["moda"], words: ["geyim", "paltar", "köynək", "koynek", "şalvar", "salvar", "jeans", "ayaqqabı", "ayaqqabi", "çanta", "canta", "kostyum"] },
  { category: ["elektronika"], words: ["telefon", "iphone", "samsung", "noutbuk", "laptop", "kompüter", "komputer", "qulaqcıq", "qulaqciq", "televizor", "kamera"] },
  { category: ["gözəllik", "baxım"], words: ["ətir", "etir", "parfum", "krem", "şampun", "sampun", "makiyaj", "kosmetika", "saç", "sac"] },
  { category: ["ana", "uşaq"], words: ["uşaq", "usaq", "körpə", "korpe", "oyuncaq", "beşik", "besik"] },
  { category: ["avto"], words: ["avtomobil", "maşın", "masin", "mühərrik", "muherrik", "təkər", "teker", "yağ", "yag"] },
  { category: ["ev", "bağ"], words: ["mebel", "divan", "masa", "stul", "yataq", "mətbəx", "metbex", "bağ", "bag"] },
  { category: ["idman", "outdoor"], words: ["idman", "fitness", "trenajor", "velosiped", "top", "çadır", "cadir"] },
  { category: ["kitab"], words: ["kitab", "roman", "dərslik", "derslik", "jurnal"] },
  { category: ["qida", "içki"], words: ["qida", "yemək", "yemek", "içki", "icki", "qəhvə", "qehve", "çay", "cay"] },
  { category: ["tikinti", "alət"], words: ["alət", "alet", "drel", "mişar", "misar", "tikinti", "vintaçan", "vintacan"] },
  { category: ["heyvan"], words: ["it", "pişik", "pisik", "heyvan", "yem", "akvarium"] },
  { category: ["səyahət", "baqaj", "çanta"], words: ["çamadan", "camadan", "baqaj", "səyahət", "seyahat", "yol çantası", "noutbuk çantası"] },
  { category: ["hobbi", "yaradıcılıq"], words: ["musiqi", "gitara", "piano", "rəsm", "resm", "pazl", "model", "əl işi", "el isi"] },
  { category: ["hədiyyə", "bayram"], words: ["hədiyyə", "hediyye", "gül", "gul", "buket", "şar", "sar", "suvenir", "bayram"] },
];

const PRODUCT_FIELD_LABELS: Record<string, string> = {
  name: "Ad",
  costAmount: "Maya dəyəri",
  priceAmount: "Qiymət",
  discountedPriceAmount: "Endirimli qiymət",
  stockQuantity: "Stok sayı",
};

function normalizeCategoryText(value: string) {
  return value.trim().toLocaleLowerCase("az-AZ");
}

function suggestedCategories(productName: string, categories: CategoryOption[]) {
  const name = normalizeCategoryText(productName);
  if (name.length < 2) return [];

  return categories
    .map((category) => {
      const categoryName = normalizeCategoryText(category.name);
      let score = categoryName.split(/\s+/).filter((word) => word.length > 2 && name.includes(word)).length * 4;

      CATEGORY_KEYWORD_GROUPS.forEach((group) => {
        if (
          group.category.some((word) => categoryName.includes(word)) &&
          group.words.some((word) => name.includes(word))
        ) {
          score += 6;
        }
      });

      return { category, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.category.name.localeCompare(right.category.name, "az"))
    .slice(0, 3)
    .map((item) => item.category);
}

function ProductDescriptionEditor({
  initialValue,
  disabled,
}: {
  initialValue: string;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertText(text: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue = `${value.slice(0, start)}${text}${value.slice(end)}`;
    setValue(nextValue);
    window.requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + text.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  const tools = [
    { label: "Başlıq", icon: Heading2, text: `${value.trim() ? "\n\n" : ""}## Başlıq\n` },
    { label: "Abzas", icon: Pilcrow, text: "\n\n" },
    { label: "Maddə", icon: List, text: `${value.trim() ? "\n" : ""}• ` },
    { label: "Nömrə", icon: ListOrdered, text: `${value.trim() ? "\n" : ""}1. ` },
  ];

  return (
    <label className="grid gap-2 text-sm font-medium">
      Açıqlama
      <div className="overflow-hidden rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
        <div className="flex gap-1.5 overflow-x-auto border-b bg-muted/45 p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.label}
                type="button"
                disabled={disabled}
                onClick={() => insertText(tool.text)}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border bg-background px-3 text-xs font-semibold text-foreground shadow-sm disabled:opacity-50"
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {tool.label}
              </button>
            );
          })}
        </div>
        <textarea
          ref={textareaRef}
          name="description"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Məhsulu hissələrə bölərək təsvir edin..."
          className="min-h-40 w-full resize-y border-0 bg-transparent px-3.5 py-3 text-sm leading-6 outline-none"
          disabled={disabled}
        />
      </div>
      <span className="text-xs font-normal text-muted-foreground">
        Başlıq, abzas və siyahılar məhsul səhifəsində eyni quruluşda göstərilir.
      </span>
    </label>
  );
}

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

function ExistingProductImages({
  product,
  disabled,
}: {
  product: ManagedProduct;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function runImageAction(action: "primary" | "delete", imageId: string) {
    if (isPending || disabled) {
      return;
    }

    const formData = new FormData();
    formData.set("imageId", imageId);

    startTransition(async () => {
      const result =
        action === "primary"
          ? await setPrimaryProductImageAction(formData)
          : await deleteProductImageAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Şəkil əməliyyatı alınmadı");
        return;
      }

      void appAlert.success("Uğurludur", result.message);
      router.refresh();
    });
  }

  if (product.images.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3 rounded-md border bg-background p-3">
      <div>
        <p className="text-sm font-semibold">Mövcud şəkillər</p>
        <p className="mt-1 text-xs font-medium text-muted-foreground">
          Əsas şəkli aşağı hissədən seçə bilərsiniz.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {product.images.map((image) => (
          <div
            key={image.id}
            className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
          >
            <img
              src={image.url}
              alt={image.altText ?? product.name}
              className="h-full w-full object-cover"
            />
            {image.isPrimary ? (
              <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-1 text-[10px] font-bold text-primary-foreground">
                Əsas
              </span>
            ) : (
              <button
                type="button"
                className="absolute inset-x-1 bottom-1 rounded bg-background/95 px-1.5 py-1 text-[10px] font-bold text-foreground shadow-sm transition hover:bg-primary hover:text-primary-foreground"
                onClick={() => runImageAction("primary", image.id)}
                disabled={disabled || isPending}
              >
                Əsas et
              </button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute right-1 top-1 z-10 size-9 rounded-md border border-white bg-red-600 text-white shadow-sm hover:bg-red-700 hover:text-white"
              onClick={() => runImageAction("delete", image.id)}
              disabled={disabled || isPending}
              aria-label="Şəkli sil"
            >
              <span aria-hidden="true" className="text-base font-black leading-none">
                ×
              </span>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
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
  standalone = false,
  profitTrackingEnabled = false,
}: ProductFormProps) {
  const [isPending, startTransition] = useTransition();
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [trackStock, setTrackStock] = useState(product?.stockTrackingEnabled ?? false);
  const [productName, setProductName] = useState(product?.name ?? "");
  const [commerceType, setCommerceType] = useState<"sale" | "rental">(
    product?.commerceType ?? "sale",
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState(product?.categoryId ?? "");
  const initialCategory = categories.find((category) => category.id === product?.categoryId);
  const [selectedRootCategoryId, setSelectedRootCategoryId] = useState(
    initialCategory?.parentId ?? initialCategory?.id ?? "",
  );
  const [isRootCategoryOpen, setIsRootCategoryOpen] = useState(false);
  const [isSubcategoryOpen, setIsSubcategoryOpen] = useState(false);
  const categoryPickerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const router = useRouter();
  const selectedLocationMap = new Map(
    productLocations.map((item) => [item.locationId, item]),
  );
  const showLocationSection = mode !== "personal-create" && locations.length > 0;
  const existingImageCount = mode === "edit" ? product?.images.length ?? 0 : 0;
  const newImageLimit =
    imageLimit === null ? null : Math.max(imageLimit - existingImageCount, 0);
  const categorySuggestions = useMemo(
    () => suggestedCategories(productName, categories),
    [categories, productName],
  );
  const rootCategories = useMemo(
    () => categories.filter((category) => !category.parentId),
    [categories],
  );
  const subcategories = useMemo(
    () => categories.filter((category) => category.parentId === selectedRootCategoryId),
    [categories, selectedRootCategoryId],
  );
  const selectedRootCategory = rootCategories.find(
    (category) => category.id === selectedRootCategoryId,
  );
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);

  useEffect(() => {
    if (!isRootCategoryOpen && !isSubcategoryOpen) return;

    function closeCategoryMenus(event: PointerEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent) {
        if (event.key !== "Escape") return;
      } else if (categoryPickerRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsRootCategoryOpen(false);
      setIsSubcategoryOpen(false);
    }

    document.addEventListener("pointerdown", closeCategoryMenus);
    document.addEventListener("keydown", closeCategoryMenus);
    return () => {
      document.removeEventListener("pointerdown", closeCategoryMenus);
      document.removeEventListener("keydown", closeCategoryMenus);
    };
  }, [isRootCategoryOpen, isSubcategoryOpen]);

  function selectCategory(category: CategoryOption) {
    const rootId = category.parentId ?? category.id;
    setSelectedRootCategoryId(rootId);
    setSelectedCategoryId(category.id);
    setIsRootCategoryOpen(false);
    setIsSubcategoryOpen(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const invalidField = form.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      ":invalid",
    );

    if (invalidField) {
      const fieldLabel = PRODUCT_FIELD_LABELS[invalidField.name] ?? "Bu sahə";
      const message = invalidField.validity.valueMissing
        ? `${fieldLabel} sahəsini doldurun.`
        : invalidField.validity.rangeUnderflow
          ? `${fieldLabel} üçün icazə verilən minimum dəyəri daxil edin.`
          : invalidField.validity.rangeOverflow
            ? `${fieldLabel} üçün icazə verilən maksimum dəyəri daxil edin.`
            : `${fieldLabel} sahəsində düzgün dəyər daxil edin.`;

      void appAlert.info("Məlumatları yoxlayın", message);
      invalidField.focus({ preventScroll: true });
      invalidField.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const formData = new FormData(form);
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
      void queryClient.invalidateQueries({ queryKey: ["marketplace-products"] });
      void queryClient.invalidateQueries({ queryKey: ["marketplace-search"] });
      void queryClient.invalidateQueries({ queryKey: ["related-products"] });
      setImageFiles([]);

      if (standalone) {
        if (mode === "store-create") {
          router.replace("/store/dashboard/products");
          router.refresh();
          return;
        }
        router.refresh();
      } else if (successRedirect) {
        router.replace(successRedirect);
        router.refresh();
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="grid min-w-0 gap-5 overflow-hidden rounded-xl border bg-card p-4 text-card-foreground shadow-sm sm:p-5 [&_input]:min-w-0 [&_select]:min-w-0 [&_select]:w-full [&_textarea]:min-w-0 [&_textarea]:w-full"
    >
      {product ? <input type="hidden" name="productId" value={product.id} /> : null}
      {mode === "store-create" ? (
        <input type="hidden" name="storeId" value={stores[0]?.id ?? ""} />
      ) : null}

      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
        <label className="grid min-w-0 content-start gap-2 text-sm font-medium">
          Ad
          <input
            name="name"
            value={productName}
            onChange={(event) => setProductName(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
            required
            disabled={disabled}
          />
        </label>
        <div ref={categoryPickerRef} className="grid min-w-0 gap-3 text-sm font-medium">
          <span>Kateqoriya</span>
          <input type="hidden" name="categoryId" value={selectedCategoryId} />
          {categorySuggestions.length > 0 ? (
            <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categorySuggestions.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700"
                  onClick={() => selectCategory(category)}
                >
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  {category.name}
                </button>
              ))}
            </div>
          ) : null}
          <div className="relative grid gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Əsas kateqoriya</span>
            <button
              type="button"
              className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 text-left text-sm outline-none transition hover:border-slate-300 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950"
              disabled={disabled}
              aria-expanded={isRootCategoryOpen}
              onClick={() => {
                setIsRootCategoryOpen((current) => !current);
                setIsSubcategoryOpen(false);
              }}
            >
              <span className={selectedRootCategory ? "text-foreground" : "text-muted-foreground"}>
                {selectedRootCategory?.name ?? "Əsas kateqoriya seçin"}
              </span>
              <ChevronDown className={`size-4 transition-transform ${isRootCategoryOpen ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            {isRootCategoryOpen ? (
              <div className="absolute inset-x-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl">
                <button
                  type="button"
                  className="flex min-h-10 w-full items-center justify-between rounded-lg px-3 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    setSelectedRootCategoryId("");
                    setSelectedCategoryId("");
                    setIsRootCategoryOpen(false);
                  }}
                >
                  Kateqoriyasız
                  {!selectedRootCategoryId ? <Check className="size-4 text-primary" /> : null}
                </button>
                {rootCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className="flex min-h-10 w-full items-center justify-between rounded-lg px-3 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      setSelectedRootCategoryId(category.id);
                      setSelectedCategoryId(category.id);
                      setIsRootCategoryOpen(false);
                    }}
                  >
                    <span>{category.name}</span>
                    {selectedRootCategoryId === category.id ? <Check className="size-4 text-primary" /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {selectedRootCategoryId && subcategories.length > 0 ? (
            <div className="relative grid gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">Alt kateqoriya</span>
              <button
                type="button"
                className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 text-left text-sm outline-none transition hover:border-slate-300 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950"
                disabled={disabled}
                aria-expanded={isSubcategoryOpen}
                onClick={() => setIsSubcategoryOpen((current) => !current)}
              >
                <span className={selectedCategory?.parentId ? "text-foreground" : "text-muted-foreground"}>
                  {selectedCategory?.parentId ? selectedCategory.name : "Alt kateqoriya seçin"}
                </span>
                <ChevronDown className={`size-4 transition-transform ${isSubcategoryOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              {isSubcategoryOpen ? (
                <div className="absolute inset-x-0 top-full z-40 mt-1 max-h-64 overflow-y-auto rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl">
                  {subcategories.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      className="flex min-h-10 w-full items-center justify-between rounded-lg px-3 text-left text-sm hover:bg-accent"
                      onClick={() => selectCategory(category)}
                    >
                      <span>{category.name}</span>
                      {selectedCategoryId === category.id ? <Check className="size-4 text-primary" /> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <section className="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/50">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex min-w-0 items-start gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              name="stockTrackingEnabled"
              checked={trackStock}
              onChange={(event) => setTrackStock(event.target.checked)}
              disabled={disabled}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span className="grid gap-1">
              <span>Stok sayını izləmək</span>
              <span className="text-xs font-normal leading-5 text-muted-foreground">
                Aktiv olduqda sifarişlər stok sayı ilə məhdudlaşır.
              </span>
            </span>
          </label>
          {trackStock ? (
            <label className="grid w-full gap-1.5 text-sm font-medium sm:w-44">
              Stok sayı
              <input
                name="stockQuantity"
                type="number"
                min="0"
                step="1"
                defaultValue={product?.stockQuantity ?? undefined}
                placeholder="Məsələn, 25"
                className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                required
                disabled={disabled}
              />
            </label>
          ) : (
            <span className="text-xs font-medium text-muted-foreground sm:pr-1">
              Limitsiz sifariş
            </span>
          )}
        </div>
        <input type="hidden" name="stockTrackingPresent" value="1" />
      </section>

      <fieldset className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/50">
        <legend className="px-1 text-sm font-semibold">Elan növü</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["sale", "rental"] as const).map((type) => (
            <label
              key={type}
              className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-3 text-sm font-semibold transition ${
                commerceType === type
                  ? "border-blue-500 bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/15 dark:bg-blue-500"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
              }`}
            >
              <input
                type="radio"
                name="commerceType"
                value={type}
                checked={commerceType === type}
                onChange={() => setCommerceType(type)}
                disabled={disabled}
                className="sr-only"
              />
              {type === "sale" ? "Satış" : "İcarə"}
            </label>
          ))}
        </div>
      </fieldset>

      <div
        className={`grid min-w-0 gap-4 sm:grid-cols-2 ${
          profitTrackingEnabled ? "lg:grid-cols-4" : "lg:grid-cols-3"
        }`}
      >
        {profitTrackingEnabled ? <label className="grid min-w-0 gap-2 text-sm font-medium">
          Maya dəyəri
          <input
            name="costAmount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={product?.costAmount ?? undefined}
            placeholder="Maya dəyəri"
            required
            className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
            disabled={disabled}
          />
        </label> : null}
        <label className="grid min-w-0 gap-2 text-sm font-medium">
          {commerceType === "rental" ? "İcarə qiyməti" : "Satış qiyməti"}
          <input
            name="priceAmount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={product?.priceAmount ?? undefined}
            placeholder="Əsas qiymət"
            className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
            required
            disabled={disabled}
          />
        </label>
        <label className="grid min-w-0 gap-2 text-sm font-medium">
          Endirimli qiymət
          <input
            name="discountedPriceAmount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={
              product
                ? Math.max(product.priceAmount - product.discountAmount, 0) || ""
                : ""
            }
            placeholder="Endirim yoxdursa boş saxlayın"
            className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
            disabled={disabled}
          />
        </label>
        <label className="grid min-w-0 gap-2 text-sm font-medium">
          Status
          <select
            name="status"
            defaultValue={product?.status ?? "active"}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-950 outline-none transition hover:border-slate-300 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
            disabled={disabled}
          >
            <option value="draft">Qaralama</option>
            <option value="active">Aktiv</option>
            <option value="archived">Arxiv</option>
          </select>
        </label>
      </div>

      <ProductDescriptionEditor initialValue={product?.description ?? ""} disabled={disabled} />

      <input type="hidden" name="depositEnabled" value="off" />
      <input type="hidden" name="depositType" value="fixed" />
      <input type="hidden" name="depositValue" value="0" />

      <ProductVariantEditor product={product} disabled={disabled} />

      {showLocationSection ? (
        <div className="grid gap-4 rounded-md border bg-background p-4">
          <div>
            <p className="text-sm font-medium">Satış nöqtələri və mövcudluq</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Məhsulun mövcud olduğu satış nöqtələri
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
                      defaultChecked={locations.length === 1 || Boolean(selected)}
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
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <label className="grid gap-2 text-sm font-medium">
        Şəkillər
        {mode === "edit" && product ? (
          <ExistingProductImages product={product} disabled={disabled || isPending} />
        ) : null}
        <ImageDropzone
          files={imageFiles}
          onFilesChange={setImageFiles}
          disabled={disabled}
          maxFiles={newImageLimit}
          title={mode === "edit" ? "Yeni şəkil əlavə et" : "Şəkil əlavə et"}
        />
        <span className="text-xs font-medium text-muted-foreground">
          {imageLimit === null
            ? "Şəkil limiti limitsizdir."
            : mode === "edit"
              ? `${existingImageCount + imageFiles.length}/${imageLimit} şəkil`
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
