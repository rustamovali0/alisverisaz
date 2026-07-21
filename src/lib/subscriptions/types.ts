export type SubscriptionPlan = {
  id: string;
  name: string;
  description: string | null;
  priceAmount: number;
  currency: string;
  billingInterval: string;
  listingLimit: number;
  isActive: boolean;
};

export type StoreSubscription = {
  id: string;
  storeId: string;
  planId: string;
  planName: string;
  status: string;
  startsAt: string;
  endsAt: string | null;
  listingLimit: number;
  listingCount: number;
  remainingListings: number;
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
