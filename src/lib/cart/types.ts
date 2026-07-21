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
