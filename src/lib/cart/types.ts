import type {
  ProductOptionInput,
  ProductVariantCombinationInput,
} from "@/lib/products/types";

export type CartProduct = {
  id: string;
  slug: string;
  storeId: string;
  categoryId?: string | null;
  storeSlug?: string | null;
  storeName?: string | null;
  createdAt?: string | null;
  name: string;
  description: string | null;
  priceAmount: number;
  discountAmount: number;
  stockQuantity: number;
  imageUrl: string | null;
  depositEnabled: boolean;
  depositType: "fixed" | "percent";
  depositValue: number;
  depositAmount: number;
  options?: ProductOptionInput[];
  variantCombinations?: ProductVariantCombinationInput[];
};

export type MarketplaceProductSort = "newest" | "oldest" | "price_asc" | "price_desc";

export type MarketplaceProductPage = {
  products: CartProduct[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type ProductImage = {
  url: string;
  isPrimary: boolean;
};

export type MarketplaceStore = {
  id: string;
  ownerId?: string | null;
  name: string;
  slug: string;
  description: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  updatedAt?: string | null;
  productCount: number;
  sampleProducts: CartProduct[];
  productNextCursor?: string | null;
  productHasMore?: boolean;
  categoryIds: string[];
};

export type MarketplaceProductDetail = {
  product: CartProduct & {
    slug: string;
    images: ProductImage[];
  };
  store: MarketplaceStore;
};

export type CartItem = {
  productId: string;
  quantity: number;
  selectedOptions?: Record<string, string>;
  variantKey?: string;
};

export type CheckoutActionResult =
  | {
      ok: true;
      message: string;
      orderIds: string[];
      orders?: Array<{
        id?: unknown;
        storeId?: unknown;
        orderNumber?: unknown;
        totalAmount?: unknown;
        itemCount?: unknown;
      }>;
      isGuest?: boolean;
    }
  | {
      ok: false;
      message: string;
    };
