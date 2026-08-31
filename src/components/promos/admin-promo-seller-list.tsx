"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { PromoSellerSummary } from "@/lib/promos/types";

type AdminPromoSellerListProps = {
  sellers: PromoSellerSummary[];
};

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("az-AZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function AdminPromoSellerList({ sellers }: AdminPromoSellerListProps) {
  const [query, setQuery] = useState("");
  const filteredSellers = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return sellers;
    }

    return sellers.filter((seller) =>
      [seller.storeName, seller.storeSlug, seller.lastPromoCode, seller.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [query, sellers]);

  return (
    <div className="grid gap-4">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Mağaza və ya promo kod axtar"
          className="h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-normal text-muted-foreground">
            <tr className="border-b">
              <th className="px-4 py-3">Mağaza</th>
              <th className="px-4 py-3">Aktiv promo sayı</th>
              <th className="px-4 py-3">Son promo</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Əməliyyat</th>
            </tr>
          </thead>
          <tbody>
            {filteredSellers.map((seller) => (
              <tr key={seller.storeId} className="border-b last:border-b-0">
                <td className="px-4 py-3">
                  <p className="font-black">{seller.storeName}</p>
                  <p className="text-xs text-muted-foreground">/{seller.storeSlug}</p>
                </td>
                <td className="px-4 py-3">{seller.activePromoCount}</td>
                <td className="px-4 py-3">
                  {seller.lastPromoCode ? (
                    <>
                      <p className="font-semibold">{seller.lastPromoCode}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(seller.lastPromoCreatedAt)}
                      </p>
                    </>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-muted px-2 py-1 text-xs font-bold">
                    {seller.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Button asChild size="sm">
                    <Link href={`/radmin/promos/${seller.storeId}`}>Promo-lara bax</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredSellers.length === 0 ? (
          <div className="grid min-h-36 place-items-center text-sm text-muted-foreground">
            Nəticə tapılmadı.
          </div>
        ) : null}
      </div>
    </div>
  );
}
