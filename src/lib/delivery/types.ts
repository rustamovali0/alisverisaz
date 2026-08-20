export type DeliveryMethod = "pickup" | "courier" | "region";

export type DeliverySettings = {
  pickupEnabled: boolean;
  courierEnabled: boolean;
  regionEnabled: boolean;
  bakuPrice: number;
  regionPrice: number;
  freeDeliveryThreshold: number | null;
  pickupEstimate: string;
  courierEstimate: string;
  regionEstimate: string;
};

export type DeliveryStoreOverride = {
  storeId: string;
  storeName: string;
  storeSlug: string | null;
  pickupEnabled: boolean | null;
  courierEnabled: boolean | null;
  regionEnabled: boolean | null;
  bakuPrice: number | null;
  regionPrice: number | null;
  freeDeliveryThreshold: number | null;
  pickupEstimate: string | null;
  courierEstimate: string | null;
  regionEstimate: string | null;
};

export type DeliveryActionResult = {
  ok: boolean;
  message: string;
};
