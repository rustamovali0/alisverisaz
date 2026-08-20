import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOwnedStores } from "@/lib/dashboard/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  AdminSubscriptionAssignment,
  StoreEntitlements,
  StoreSubscription,
  SubscriptionPlan,
} from "@/lib/subscriptions/types";

type PlanRow = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  price_amount: string | number;
  currency: string;
  billing_interval: string;
  limits: {
    listing_limit?: number;
    product_limit?: number | null;
    images_per_product_limit?: number | null;
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
  current_period_start?: string | null;
  current_period_end?: string | null;
  payment_provider?: string | null;
  payment_status?: string | null;
  subscription_plans:
    | {
        name: string;
        slug?: string | null;
        limits: {
          listing_limit?: number;
          product_limit?: number | null;
          images_per_product_limit?: number | null;
        } | null;
      }
    | Array<{
        name: string;
        slug?: string | null;
        limits: {
          listing_limit?: number;
          product_limit?: number | null;
          images_per_product_limit?: number | null;
        } | null;
      }>
    | null;
};

function readPlan(plan: PlanRow): SubscriptionPlan {
  const productLimit = readNullableLimit(plan.limits?.product_limit);
  const legacyListingLimit = readNullableLimit(plan.limits?.listing_limit);

  return {
    id: plan.id,
    name: plan.name,
    slug: plan.slug ?? "",
    description: plan.description,
    priceAmount: Number(plan.price_amount),
    currency: plan.currency,
    billingInterval: plan.billing_interval,
    listingLimit: productLimit ?? legacyListingLimit ?? 0,
    productLimit: productLimit ?? legacyListingLimit,
    imagesPerProductLimit: readNullableLimit(plan.limits?.images_per_product_limit),
    isActive: plan.is_active,
  };
}

function readJoinedPlan(subscription: SubscriptionRow) {
  const joined = Array.isArray(subscription.subscription_plans)
    ? subscription.subscription_plans[0]
    : subscription.subscription_plans;

  return {
    name: joined?.name ?? "Plan",
    slug: joined?.slug ?? null,
    listingLimit: readNullableLimit(joined?.limits?.product_limit) ??
      readNullableLimit(joined?.limits?.listing_limit) ??
      0,
    productLimit:
      readNullableLimit(joined?.limits?.product_limit) ??
      readNullableLimit(joined?.limits?.listing_limit),
    imagesPerProductLimit: readNullableLimit(joined?.limits?.images_per_product_limit),
  };
}

function readNullableLimit(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }

  if (typeof value === "string" && /^\d+$/.test(value)) {
    return Math.floor(Number(value));
  }

  return null;
}

export async function getSubscriptionPlans(includeInactive = false) {
  const supabase = await createSupabaseServerClient();
  let query = (supabase as any)
    .from("subscription_plans")
    .select("id,name,slug,description,price_amount,currency,billing_interval,limits,is_active")
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
      "id,store_id,plan_id,status,starts_at,ends_at,current_period_start,current_period_end,payment_provider,payment_status,subscription_plans(name,slug,limits)",
    )
    .eq("store_id", storeId)
    .in("status", ["trialing", "active", "assigned"])
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
    .eq("listing_type", "store")
    .in("status", ["draft", "active"]);

  const listingCount = count ?? 0;

  return {
    id: row.id,
    storeId: row.store_id,
    planId: row.plan_id,
    planName: plan.name,
    planSlug: plan.slug,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    currentPeriodStart: row.current_period_start ?? null,
    currentPeriodEnd: row.current_period_end ?? null,
    paymentProvider: row.payment_provider ?? null,
    paymentStatus: row.payment_status ?? null,
    listingLimit: plan.listingLimit,
    productLimit: plan.productLimit,
    imagesPerProductLimit: plan.imagesPerProductLimit,
    listingCount,
    remainingListings:
      plan.productLimit === null
        ? Number.POSITIVE_INFINITY
        : Math.max(plan.productLimit - listingCount, 0),
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
  const entitlements = await getStoreEntitlements(storeId);

  return {
    allowed:
      entitlements.productLimit === null ||
      entitlements.productCount < entitlements.productLimit,
    subscription: {
      id: "",
      storeId,
      planId: "",
      planName: "Effective limit",
      planSlug: null,
      status: "effective",
      startsAt: "",
      endsAt: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      paymentProvider: null,
      paymentStatus: null,
      listingLimit: entitlements.productLimit ?? 0,
      productLimit: entitlements.productLimit,
      imagesPerProductLimit: entitlements.imagesPerProductLimit,
      listingCount: entitlements.productCount,
      remainingListings: entitlements.remainingProducts ?? Number.POSITIVE_INFINITY,
    },
  };
}

export async function getStoreEntitlements(storeId: string): Promise<StoreEntitlements> {
  const supabaseAdmin = createSupabaseAdminClient();
  const [{ data: limits }, { count }] = await Promise.all([
    (supabaseAdmin as any).rpc("get_store_effective_limits", {
      store_uuid: storeId,
    }),
    (supabaseAdmin as any)
      .from("products")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("store_id", storeId)
      .eq("listing_type", "store")
      .in("status", ["draft", "active"]),
  ]);
  const row = Array.isArray(limits) ? limits[0] : limits;
  const productLimit = readNullableLimit(row?.product_limit);
  const imagesPerProductLimit = readNullableLimit(row?.images_per_product_limit);
  const productCount = count ?? 0;

  return {
    storeId,
    productLimit,
    imagesPerProductLimit,
    productCount,
    remainingProducts:
      productLimit === null ? null : Math.max(productLimit - productCount, 0),
  };
}

export async function getAdminSubscriptionAssignments() {
  const supabaseAdmin = createSupabaseAdminClient();
  const [{ data: stores }, { data: subscriptions }] = await Promise.all([
    (supabaseAdmin as any)
      .from("stores")
      .select("id,name,slug,owner_id,profiles(email,full_name)")
      .order("created_at", {
        ascending: false,
      }),
    (supabaseAdmin as any)
      .from("subscriptions")
      .select(
        "id,store_id,plan_id,status,starts_at,ends_at,current_period_start,current_period_end,payment_provider,payment_status,subscription_plans(name,slug,limits)",
      )
      .in("status", ["trialing", "active", "past_due", "assigned"])
      .order("created_at", {
        ascending: false,
      }),
  ]);

  const subscriptionByStoreId = new Map<string, SubscriptionRow>();

  for (const subscription of (subscriptions ?? []) as SubscriptionRow[]) {
    if (!subscriptionByStoreId.has(subscription.store_id)) {
      subscriptionByStoreId.set(subscription.store_id, subscription);
    }
  }

  return ((stores ?? []) as Array<{
    id: string;
    name: string;
    slug: string | null;
    owner_id: string;
    profiles:
      | {
          email: string | null;
          full_name: string | null;
        }
      | Array<{
          email: string | null;
          full_name: string | null;
        }>
      | null;
  }>).map((store): AdminSubscriptionAssignment => {
    const owner = Array.isArray(store.profiles)
      ? store.profiles[0]
      : store.profiles;
    const subscription = subscriptionByStoreId.get(store.id) ?? null;
    const plan = subscription ? readJoinedPlan(subscription) : null;

    return {
      storeId: store.id,
      storeName: store.name,
      storeSlug: store.slug,
      ownerId: store.owner_id,
      ownerName: owner?.full_name ?? null,
      ownerEmail: owner?.email ?? null,
      subscription: subscription
        ? {
            id: subscription.id,
            storeId: subscription.store_id,
            planId: subscription.plan_id,
            planName: plan?.name ?? "Plan",
            planSlug: plan?.slug ?? null,
            status: subscription.status,
            startsAt: subscription.starts_at,
            endsAt: subscription.ends_at,
            currentPeriodStart: subscription.current_period_start ?? null,
            currentPeriodEnd: subscription.current_period_end ?? null,
            paymentProvider: subscription.payment_provider ?? null,
            paymentStatus: subscription.payment_status ?? null,
            listingLimit: plan?.listingLimit ?? 0,
            productLimit: plan?.productLimit ?? null,
            imagesPerProductLimit: plan?.imagesPerProductLimit ?? null,
            listingCount: 0,
            remainingListings: 0,
          }
        : null,
    };
  });
}
