export type PromotionTargetType = "store" | "product";
export type PromotionRequestStatus = "pending" | "approved" | "rejected" | "canceled";

export const promotionDailyPrices: Record<PromotionTargetType, number> = {
  store: 5,
  product: 3,
};

export type PromotionRequest = {
  id: string;
  requesterId: string;
  targetType: PromotionTargetType;
  storeId: string;
  storeName: string;
  storeSlug: string | null;
  productId: string | null;
  productName: string | null;
  status: PromotionRequestStatus;
  requestedDays: number;
  dailyPriceAmount: number;
  totalAmount: number;
  currency: string;
  startsAt: string | null;
  endsAt: string | null;
  sellerNote: string | null;
  adminNote: string | null;
  requesterName: string | null;
  requesterEmail: string | null;
  createdAt: string;
};

export type PromotionActionResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };
