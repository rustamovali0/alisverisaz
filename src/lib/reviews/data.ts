import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ProductReview = {
  id: string;
  productId: string;
  userId: string;
  productName: string;
  storeName: string;
  userName: string;
  rating: number;
  comment: string | null;
  status: string;
  createdAt: string;
};

type ReviewRow = {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  status: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
  } | null;
  products?: {
    name: string;
    stores?: {
      name: string;
    } | null;
  } | null;
};

function mapReview(row: ReviewRow): ProductReview {
  return {
    id: row.id,
    productId: row.product_id,
    userId: row.user_id,
    productName: row.products?.name ?? row.product_id,
    storeName: row.products?.stores?.name ?? "",
    userName: row.profiles?.full_name || row.profiles?.email || "İstifadəçi",
    rating: row.rating,
    comment: row.comment,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function getProductReviews(productId: string) {
  const supabase = createSupabaseAdminClient();
  const { data } = await (supabase as any)
    .from("reviews")
    .select("id,product_id,user_id,rating,comment,status,created_at,profiles(full_name,email),products(name,stores(name))")
    .eq("product_id", productId)
    .eq("status", "approved")
    .order("created_at", {
      ascending: false,
    })
    .limit(100);

  return ((data ?? []) as ReviewRow[]).map(mapReview);
}

export async function hasUserPurchasedProduct(input: {
  userId: string;
  productId: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await (supabase as any)
    .from("order_items")
    .select("id,orders!inner(user_id,status)")
    .eq("product_id", input.productId)
    .eq("orders.user_id", input.userId)
    .in("orders.status", ["pending", "confirmed", "processing", "delivered"])
    .limit(1);

  if (error) {
    return false;
  }

  return Boolean(data?.length);
}

export async function getAdminProductReviews() {
  const supabase = await createSupabaseServerClient();
  const { data } = await (supabase as any)
    .from("reviews")
    .select("id,product_id,user_id,rating,comment,status,created_at,profiles(full_name,email),products(name,stores(name))")
    .order("created_at", {
      ascending: false,
    })
    .limit(300);

  return ((data ?? []) as ReviewRow[]).map(mapReview);
}

export function getReviewSummary(reviews: ProductReview[]) {
  if (reviews.length === 0) {
    return {
      average: 0,
      count: 0,
    };
  }

  const total = reviews.reduce((sum, review) => sum + review.rating, 0);

  return {
    average: Math.round((total / reviews.length) * 10) / 10,
    count: reviews.length,
  };
}
