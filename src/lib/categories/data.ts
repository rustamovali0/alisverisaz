import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AdminCategory = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  imageUrl: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

type CategoryRow = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  image_url: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
};

function toAdminCategory(row: CategoryRow): AdminCategory {
  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    slug: row.slug,
    imageUrl: row.image_url,
    description: row.description,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

export async function getAdminCategories() {
  const supabase = createSupabaseAdminClient();
  const { data, count } = await (supabase as any)
    .from("categories")
    .select("id,parent_id,name,slug,image_url,description,sort_order,is_active", {
      count: "exact",
    })
    .order("parent_id", { ascending: true, nullsFirst: true })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return {
    total: count ?? data?.length ?? 0,
    categories: ((data ?? []) as CategoryRow[]).map(toAdminCategory),
  };
}
