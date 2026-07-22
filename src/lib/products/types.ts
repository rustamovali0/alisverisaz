export type ProductStatus = "draft" | "active" | "archived";

export type ProductVariantInput = {
  name: string;
  value: string;
  priceDeltaAmount: number;
  stockQuantity: number;
};

export type ProductActionResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

export type ManagedProduct = {
  id: string;
  storeId: string;
  name: string;
  nameTranslations: Record<string, string>;
  categoryId: string | null;
  costAmount: number;
  priceAmount: number;
  discountAmount: number;
  stockQuantity: number;
  status: ProductStatus;
  description: string | null;
  descriptionTranslations: Record<string, string>;
  seoTitleTranslations: Record<string, string>;
  seoDescriptionTranslations: Record<string, string>;
  listingType: "store" | "personal";
  paymentStatus?: string;
  depositEnabled: boolean;
  depositType: "fixed" | "percent";
  depositValue: number;
  images: Array<{
    id: string;
    url: string;
    altText: string | null;
  }>;
  variants: ProductVariantInput[];
};

export type CategoryOption = {
  id: string;
  name: string;
  slug: string;
};
