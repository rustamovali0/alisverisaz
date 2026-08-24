import type {
  ProductOptionInput,
  ProductOptionType,
  ProductVariantCombinationInput,
} from "@/lib/products/types";

export const PRODUCT_OPTION_TYPES: ProductOptionType[] = [
  "color",
  "size",
  "custom1",
  "custom2",
];

export const DEFAULT_PRODUCT_OPTIONS: ProductOptionInput[] = [
  {
    type: "color",
    name: "Rəng",
    isEnabled: false,
    sortOrder: 0,
    values: [],
  },
  {
    type: "size",
    name: "Ölçü",
    isEnabled: false,
    sortOrder: 1,
    values: [],
  },
  {
    type: "custom1",
    name: "",
    isEnabled: false,
    sortOrder: 2,
    values: [],
  },
  {
    type: "custom2",
    name: "",
    isEnabled: false,
    sortOrder: 3,
    values: [],
  },
];

export type ProductVariantSelection = Record<string, string>;

export function normalizeProductOptions(options: ProductOptionInput[] = []) {
  const byType = new Map(options.map((option) => [option.type, option]));

  return DEFAULT_PRODUCT_OPTIONS.map((fallback) => {
    const option = byType.get(fallback.type);

    return {
      ...fallback,
      ...option,
      name: (option?.name ?? fallback.name).trim(),
      isEnabled: Boolean(option?.isEnabled),
      values: (option?.values ?? [])
        .map((value, index) => ({
          id: value.id,
          value: value.value.trim(),
          colorHex: value.colorHex?.trim() || null,
          sortOrder: value.sortOrder ?? index,
        }))
        .filter((value) => value.value.length > 0),
    };
  });
}

export function getEnabledProductOptions(options: ProductOptionInput[] = []) {
  return normalizeProductOptions(options).filter(
    (option) => option.isEnabled && option.values.length > 0,
  );
}

export function getAutoProductVariantSelection(options: ProductOptionInput[] = []) {
  return getEnabledProductOptions(options).reduce<ProductVariantSelection>(
    (selection, option) => {
      if (option.values.length === 1) {
        selection[option.type] = option.values[0].value;
      }

      return selection;
    },
    {},
  );
}

export function getRequiredSelectableProductOptions(options: ProductOptionInput[] = []) {
  return getEnabledProductOptions(options).filter((option) => option.values.length > 1);
}

export function normalizeProductVariantSelection(
  selection: ProductVariantSelection | null | undefined,
) {
  return PRODUCT_OPTION_TYPES.reduce<ProductVariantSelection>((next, type) => {
    const value = selection?.[type]?.trim();

    if (value) {
      next[type] = value;
    }

    return next;
  }, {});
}

export function getProductVariantKey(
  productId: string,
  selection?: ProductVariantSelection | null,
) {
  const normalized = normalizeProductVariantSelection(selection);
  const suffix = PRODUCT_OPTION_TYPES.map((type) =>
    normalized[type] ? `${type}:${normalized[type]}` : "",
  )
    .filter(Boolean)
    .join("|");

  return suffix ? `${productId}::${suffix}` : productId;
}

export function formatProductVariantSelection(
  options: ProductOptionInput[] = [],
  selection?: ProductVariantSelection | null,
) {
  const normalized = normalizeProductVariantSelection(selection);

  return getEnabledProductOptions(options)
    .map((option) => {
      const value = normalized[option.type];

      return value ? `${option.name}: ${value}` : "";
    })
    .filter(Boolean);
}

export function findMatchingProductVariant(
  variants: ProductVariantCombinationInput[] = [],
  selection?: ProductVariantSelection | null,
) {
  const normalized = normalizeProductVariantSelection(selection);
  const keys = Object.keys(normalized).filter((key) => normalized[key]);

  if (keys.length === 0) {
    return null;
  }

  return (
    variants.find((variant) => {
      if (variant.isEnabled === false) {
        return false;
      }

      return keys.every((key) => variant.combination[key] === normalized[key]);
    }) ?? null
  );
}

export function getProductVariantUnitPrice(input: {
  priceAmount: number;
  discountAmount: number;
  variants?: ProductVariantCombinationInput[];
  selection?: ProductVariantSelection | null;
}) {
  const selectedVariant = findMatchingProductVariant(
    input.variants ?? [],
    input.selection,
  );

  if (
    selectedVariant &&
    selectedVariant.priceOverrideAmount !== null &&
    selectedVariant.priceOverrideAmount !== undefined
  ) {
    return selectedVariant.priceOverrideAmount;
  }

  return Math.max(input.priceAmount - input.discountAmount, 0);
}

