export type SellerPromoCode = {
  id: string;
  sellerId: string;
  storeId: string | null;
  storeName: string;
  storeSlug: string;
  code: string;
  discountPercent: number;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  promoNotificationSentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PromoSellerSummary = {
  storeId: string;
  sellerId: string;
  storeName: string;
  storeSlug: string;
  status: string;
  activePromoCount: number;
  lastPromoCode: string | null;
  lastPromoCreatedAt: string | null;
};

export type CheckoutPromoPreview = {
  storeId: string;
  code: string;
  discountPercent: number;
  subtotal: number;
  discountAmount: number;
  totalAfterDiscount: number;
};
