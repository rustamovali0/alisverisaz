import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isProfitTrackingEnabled } from "@/lib/products/profit";

export async function getSellerProfit(stores: Array<{ id: string; settings?: unknown }>) {
  const ids = stores.filter((store) => isProfitTrackingEnabled(store.settings)).map((store) => store.id);
  if (!ids.length) return null;
  const client = createSupabaseAdminClient();
  const totals = new Map<string, number>();
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await (client as any).from("seller_profit_items")
      .select("order_item_id,unit_cost,orders!inner(status,currency),order_items!inner(quantity,total_amount)")
      .in("store_id", ids).eq("orders.status", "delivered")
      .order("order_item_id").range(offset, offset + 499);
    if (error) throw new Error("Qazanc məlumatları yüklənmədi.");
    for (const row of data ?? []) {
      const item = row.order_items;
      const currency = row.orders.currency;
      const amount = Math.round(Number(item.total_amount) * 100) -
        Math.round(Number(row.unit_cost) * 100) * Number(item.quantity);
      totals.set(currency, (totals.get(currency) ?? 0) + amount);
    }
    if (!data || data.length < 500) break;
  }
  if (!totals.size) totals.set("AZN", 0);
  return Array.from(totals, ([currency, amount]) => ({ currency, amount: amount / 100 }));
}
