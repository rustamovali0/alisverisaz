import "server-only";

import { getProductApprovalSettings } from "@/lib/products/approval-settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type PendingProductApproval = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceAmount: number;
  stockQuantity: number;
  createdAt: string;
  imageUrl: string | null;
  store: {
    id: string;
    name: string;
    slug: string;
  };
  seller: {
    id: string;
    name: string;
    email: string | null;
  };
};

export async function getPendingProductApprovals() {
  const [settings, rows] = await Promise.all([
    getProductApprovalSettings(),
    getPendingProductApprovalRows(),
  ]);

  return {
    settings,
    products: rows,
  };
}

async function getPendingProductApprovalRows(): Promise<PendingProductApproval[]> {
  const supabase = createSupabaseAdminClient();
  const { data } = await (supabase as any)
    .from("products")
    .select(
      "id,name,slug,description,price_amount,stock_quantity,created_at,owner_id,product_images(url,is_primary,sort_order),stores!inner(id,name,slug,owner_id)",
    )
    .eq("listing_type", "store")
    .eq("status", "draft")
    .eq("metadata->>approval_status", "pending")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as any[];
  const ownerIds = Array.from(
    new Set(
      rows
        .map((row) => {
          const store = Array.isArray(row.stores) ? row.stores[0] : row.stores;

          return (store?.owner_id ?? row.owner_id) as string | null;
        })
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const profilesById = new Map<string, { id: string; email: string | null; full_name: string | null }>();

  if (ownerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,email,full_name")
      .in("id", ownerIds);

    (profiles ?? []).forEach((profile) => {
      profilesById.set(profile.id, profile);
    });
  }

  return rows.map((row) => {
    const store = Array.isArray(row.stores) ? row.stores[0] : row.stores;
    const sellerId = (store?.owner_id ?? row.owner_id) as string | null;
    const seller = sellerId ? profilesById.get(sellerId) : null;
    const images = [...(row.product_images ?? [])].sort((left, right) => {
      if (Boolean(left.is_primary) !== Boolean(right.is_primary)) {
        return left.is_primary ? -1 : 1;
      }

      return Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0);
    });

    return {
      id: row.id,
      name: row.name,
      slug: row.slug ?? row.id,
      description: row.description ?? null,
      priceAmount: Number(row.price_amount ?? 0),
      stockQuantity: Number(row.stock_quantity ?? 0),
      createdAt: row.created_at,
      imageUrl: images[0]?.url ?? null,
      store: {
        id: store?.id ?? "",
        name: store?.name ?? "Mağaza",
        slug: store?.slug ?? "",
      },
      seller: {
        id: seller?.id ?? sellerId ?? row.owner_id,
        name: seller?.full_name ?? seller?.email ?? "Satıcı",
        email: seller?.email ?? null,
      },
    };
  });
}
