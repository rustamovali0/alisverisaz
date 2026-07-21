import { getOwnedStores } from "@/lib/dashboard/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { DepositStatus, ManagedDeposit } from "@/lib/deposits/types";

type DepositRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  amount: string | number;
  remaining_amount: string | number;
  currency: string;
  status: DepositStatus;
  payment_url: string | null;
  created_at: string;
  products:
    | {
        name: string;
      }
    | Array<{
        name: string;
      }>
    | null;
};

function readProductName(row: DepositRow) {
  const product = Array.isArray(row.products) ? row.products[0] : row.products;

  return product?.name ?? "-";
}

function toManagedDeposit(row: DepositRow): ManagedDeposit {
  return {
    id: row.id,
    customerName: row.full_name ?? "-",
    phone: row.phone ?? "-",
    productName: readProductName(row),
    amount: Number(row.amount),
    remainingAmount: Number(row.remaining_amount),
    currency: row.currency,
    status: row.status,
    paymentUrl: row.payment_url,
    createdAt: row.created_at,
  };
}

async function getDeposits(storeIds: string[]) {
  const supabaseAdmin = createSupabaseAdminClient();
  const { data } = await (supabaseAdmin as any)
    .from("deposits")
    .select(
      "id,full_name,phone,amount,remaining_amount,currency,status,payment_url,created_at,products(name)",
    )
    .in(
      "store_id",
      storeIds.length > 0
        ? storeIds
        : ["00000000-0000-0000-0000-000000000000"],
    )
    .order("created_at", {
      ascending: false,
    });

  return ((data ?? []) as DepositRow[]).map(toManagedDeposit);
}

export async function getSellerDeposits(userId: string) {
  const stores = await getOwnedStores(userId);

  return getDeposits(stores.map((store) => store.id));
}
