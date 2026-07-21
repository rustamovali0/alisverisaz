export type CartProduct = {
  id: string;
  storeId: string;
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
};

export type MarketplaceStore = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  productCount: number;
  sampleProducts: CartProduct[];
  categoryIds: string[];
};

export type MarketplaceProductDetail = {
  product: CartProduct & {
    slug: string;
  };
  store: MarketplaceStore;
};

export type CartItem = {
  productId: string;
  quantity: number;
};

export type CheckoutActionResult =
  | {
      ok: true;
      message: string;
      orderIds: string[];
    }
  | {
      ok: false;
      message: string;
    };
