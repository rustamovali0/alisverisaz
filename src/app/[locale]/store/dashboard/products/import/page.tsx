import { requireRole } from "@/lib/auth/session";
import { getOwnedStores } from "@/lib/dashboard/data";
import { ProductImport } from "@/components/products/product-import";
export default async function ImportPage() {
  const current = await requireRole(["seller"], "/store/dashboard/products/import");
  const store = (await getOwnedStores(current.user.id)).find((s) => s.status === "active");
  if (!store) return <p>Import üçün təsdiqlənmiş aktiv mağaza tələb olunur.</p>;
  return <ProductImport storeId={store.id} />;
}
