"use client";

import { ArrowRight, CheckSquare, PackageCheck, Search } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/app-alert";
import {
  transferProductsByAdminAction,
  type ProductTransferProduct,
  type ProductTransferStore,
} from "@/lib/products/admin-transfer";
import { useRouter } from "@/i18n/navigation";

type ProductTransferManagerProps = {
  stores: ProductTransferStore[];
  products: ProductTransferProduct[];
};

export function ProductTransferManager({ stores, products }: ProductTransferManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [sourceStoreId, setSourceStoreId] = useState("");
  const [targetStoreId, setTargetStoreId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const sourceStore = stores.find((store) => store.id === sourceStoreId);
  const targetStore = stores.find((store) => store.id === targetStoreId);
  const sourceProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("az-AZ");
    return products.filter((product) =>
      product.storeId === sourceStoreId &&
      (!query || product.name.toLocaleLowerCase("az-AZ").includes(query) || product.slug.includes(query)),
    );
  }, [products, search, sourceStoreId]);

  function changeSource(nextStoreId: string) {
    setSourceStoreId(nextStoreId);
    setSelectedIds(new Set());
    setSearch("");
    if (targetStoreId === nextStoreId) setTargetStoreId("");
  }

  function toggleProduct(productId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function toggleVisibleProducts() {
    const visibleIds = sourceProducts.map((product) => product.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
    setSelectedIds((current) => {
      const next = new Set(current);
      visibleIds.forEach((id) => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  }

  async function submitTransfer() {
    if (!sourceStore || !targetStore || selectedIds.size === 0) return;
    const confirmation = await appAlert.confirm({
      title: "Məhsullar köçürülsün?",
      message: `${selectedIds.size} məhsul “${sourceStore.name}” mağazasından “${targetStore.name}” mağazasına veriləcək. Yeni satıcı onları idarə edə biləcək.`,
      confirmText: "Köçür",
      cancelText: "Ləğv et",
      variant: "default",
    });
    if (!confirmation.isConfirmed) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("sourceStoreId", sourceStore.id);
      formData.set("targetStoreId", targetStore.id);
      selectedIds.forEach((id) => formData.append("productId", id));
      const result = await transferProductsByAdminAction(formData);
      if (!result.ok) {
        void appAlert.error(result.message, "Məhsullar köçürülmədi");
        return;
      }
      void appAlert.success("Köçürmə tamamlandı", result.message);
      setSelectedIds(new Set());
      setSearch("");
      router.refresh();
    });
  }

  const allVisibleSelected = sourceProducts.length > 0 && sourceProducts.every((product) => selectedIds.has(product.id));

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 rounded-2xl border bg-background p-4 shadow-sm lg:grid-cols-[1fr_auto_1fr] lg:items-end">
        <label className="grid gap-2 text-sm font-bold">
          Mənbə mağaza
          <select value={sourceStoreId} onChange={(event) => changeSource(event.target.value)} className="h-12 rounded-xl border bg-background px-3 font-medium">
            <option value="">Mağaza seçin</option>
            {stores.map((store) => <option key={store.id} value={store.id}>{store.name} · {store.slug}</option>)}
          </select>
        </label>
        <ArrowRight className="mx-auto hidden size-6 text-primary lg:block" aria-hidden="true" />
        <label className="grid gap-2 text-sm font-bold">
          Hədəf mağaza
          <select value={targetStoreId} onChange={(event) => setTargetStoreId(event.target.value)} className="h-12 rounded-xl border bg-background px-3 font-medium">
            <option value="">Mağaza seçin</option>
            {stores.filter((store) => store.id !== sourceStoreId).map((store) => <option key={store.id} value={store.id}>{store.name} · {store.slug}</option>)}
          </select>
        </label>
      </div>

      {sourceStoreId ? (
        <section className="rounded-2xl border bg-background p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black">Köçürüləcək məhsullar</h2>
              <p className="text-sm text-muted-foreground">{selectedIds.size} məhsul seçilib</p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Məhsul axtar" aria-label="Məhsul axtar" className="h-11 w-full rounded-xl border bg-background pl-10 pr-3 text-sm" />
            </div>
          </div>

          <button type="button" onClick={toggleVisibleProducts} disabled={sourceProducts.length === 0} className="mt-4 flex items-center gap-2 text-sm font-bold text-primary disabled:text-muted-foreground">
            <CheckSquare className="size-4" aria-hidden="true" />
            {allVisibleSelected ? "Görünən seçimi ləğv et" : "Görünənlərin hamısını seç"}
          </button>

          <div className="mt-3 grid max-h-[28rem] gap-2 overflow-y-auto pr-1">
            {sourceProducts.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Bu mağazada uyğun məhsul yoxdur.</div>
            ) : sourceProducts.map((product) => (
              <label key={product.id} className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition hover:border-primary/50 hover:bg-primary/[0.03]">
                <input type="checkbox" checked={selectedIds.has(product.id)} onChange={() => toggleProduct(product.id)} className="size-5 accent-primary" />
                {product.imageUrl ? <img src={product.imageUrl} alt="" className="size-14 rounded-lg border object-cover" /> : <span className="grid size-14 place-items-center rounded-lg bg-muted"><PackageCheck className="size-6" aria-hidden="true" /></span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{product.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">/{product.slug} · {product.status}</span>
                </span>
              </label>
            ))}
          </div>
        </section>
      ) : null}

      <div className="sticky bottom-4 z-20 rounded-2xl border bg-background/95 p-3 shadow-xl backdrop-blur">
        <Button type="button" className="h-12 w-full text-base font-black" disabled={isPending || !sourceStore || !targetStore || selectedIds.size === 0} onClick={submitTransfer}>
          <ArrowRight className="mr-2 size-5" aria-hidden="true" />
          {isPending ? "Köçürülür..." : `${selectedIds.size || 0} məhsulu köçür`}
        </Button>
      </div>
    </div>
  );
}
