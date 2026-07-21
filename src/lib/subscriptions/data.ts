import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOwnedStores } from "@/lib/dashboard/data";
import type { StoreSubscription, SubscriptionPlan } from "@/lib/subscriptions/types";

type PlanRow = {
  id: string;
  name: string;
  description: string | null;
  price_amount: string | number;
  currency: string;
  billing_interval: string;
  limits: {
    listing_limit?: number;
  } | null;
  is_active: boolean;
};

type SubscriptionRow = {
  id: string;
  store_id: string;
  plan_id: string;
  status: string;
  starts_at: string;
  ends_at: string | null;
  subscription_plans:
    | {
        name: string;
        limits: {
          listing_limit?: number;
        } | null;
      }
    | Array<{
        name: string;
        limits: {
          listing_limit?: number;
        } | null;
      }>
    | null;
};

function readPlan(plan: PlanRow): SubscriptionPlan {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    priceAmount: Number(plan.price_amount),
    currency: plan.currency,
    billingInterval: plan.billing_interval,
    listingLimit: Number(plan.limits?.listing_limit ?? 0),
    isActive: plan.is_active,
  };
}

function readJoinedPlan(subscription: SubscriptionRow) {
  const joined = Array.isArray(subscription.subscription_plans)
    ? subscription.subscription_plans[0]
    : subscription.subscription_plans;

  return {
    name: joined?.name ?? "Plan",
    listingLimit: Number(joined?.limits?.listing_limit ?? 0),
  };
}

export async function getSubscriptionPlans(includeInactive = false) {
  const supabase = await createSupabaseServerClient();
  let query = (supabase as any)
    .from("subscription_plans")
    .select("id,name,description,price_amount,currency,billing_interval,limits,is_active")
    .order("price_amount", {
      ascending: true,
    });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data } = await query;

  return ((data ?? []) as PlanRow[]).map(readPlan);
}

export async function getActiveStoreSubscription(storeId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: subscription } = await (supabase as any)
    .from("subscriptions")
    .select(
      "id,store_id,plan_id,status,starts_at,ends_at,subscription_plans(name,limits)",
    )
    .eq("store_id", storeId)
    .in("status", ["trialing", "active"])
    .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (!subscription) {
    return null;
  }

  const row = subscription as SubscriptionRow;
  const plan = readJoinedPlan(row);
  const { count } = await (supabase as any)
    .from("products")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("store_id", storeId)
    .neq("status", "archived");

  const listingCount = count ?? 0;

  return {
    id: row.id,
    storeId: row.store_id,
    planId: row.plan_id,
    planName: plan.name,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    listingLimit: plan.listingLimit,
    listingCount,
    remainingListings: Math.max(plan.listingLimit - listingCount, 0),
  } satisfies StoreSubscription;
}

export async function getSellerSubscriptionOverview(userId: string) {
  const [stores, plans] = await Promise.all([
    getOwnedStores(userId),
    getSubscriptionPlans(false),
  ]);
  const storeSubscriptions = await Promise.all(
    stores.map(async (store) => ({
      store,
      subscription: await getActiveStoreSubscription(store.id),
    })),
  );

  return {
    stores,
    plans,
    storeSubscriptions,
  };
}

export async function canCreateListing(storeId: string) {
  const subscription = await getActiveStoreSubscription(storeId);

  return {
    allowed: Boolean(subscription && subscription.remainingListings > 0),
    subscription,
  };
}
