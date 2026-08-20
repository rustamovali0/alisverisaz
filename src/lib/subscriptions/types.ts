export type SubscriptionPlan = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceAmount: number;
  currency: string;
  billingInterval: string;
  listingLimit: number;
  productLimit: number | null;
  imagesPerProductLimit: number | null;
  isActive: boolean;
};

export type StoreSubscription = {
  id: string;
  storeId: string;
  planId: string;
  planName: string;
  planSlug: string | null;
  status: string;
  startsAt: string;
  endsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  paymentProvider: string | null;
  paymentStatus: string | null;
  listingLimit: number;
  productLimit: number | null;
  imagesPerProductLimit: number | null;
  listingCount: number;
  remainingListings: number;
};

export type StoreEntitlements = {
  storeId: string;
  productLimit: number | null;
  imagesPerProductLimit: number | null;
  productCount: number;
  remainingProducts: number | null;
};

export type AdminSubscriptionAssignment = {
  storeId: string;
  storeName: string;
  storeSlug: string | null;
  ownerId: string;
  ownerName: string | null;
  ownerEmail: string | null;
  subscription: StoreSubscription | null;
};

export type SubscriptionActionResult =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };
