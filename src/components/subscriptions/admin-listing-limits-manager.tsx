"use client";

import { Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AdminStoreProductLimitForm } from "@/components/subscriptions/admin-plan-form";
import { Button } from "@/components/ui/button";
import type { AdminSubscriptionAssignment } from "@/lib/subscriptions/types";
import { cn } from "@/lib/utils";

type ListingLimitFilter = "all" | "custom" | "default" | "full" | "unlimited";

type AdminListingLimitsManagerProps = {
  assignments: AdminSubscriptionAssignment[];
  defaultProductLimit: number;
};

const filters: Array<{ value: ListingLimitFilter; label: string }> = [
  { value: "all", label: "Hamısı" },
  { value: "custom", label: "Fərdi limit" },
  { value: "default", label: "Default limit" },
  { value: "full", label: "Limit dolub" },
  { value: "unlimited", label: "Limitsiz" },
];

function formatLimit(value: number | null) {
  return value === null ? "Limitsiz" : value;
}

function getSearchText(assignment: AdminSubscriptionAssignment) {
  return [
    assignment.storeName,
    assignment.storeSlug,
    assignment.ownerName,
    assignment.ownerEmail,
    assignment.subscription?.planName,
    assignment.subscription?.status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("az-AZ");
}

export function AdminListingLimitsManager({
  assignments,
  defaultProductLimit,
}: AdminListingLimitsManagerProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ListingLimitFilter>("all");
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  const selectedAssignment = useMemo(
    () => assignments.find((assignment) => assignment.storeId === selectedStoreId) ?? null,
    [assignments, selectedStoreId],
  );

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedStoreId(null);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const filteredAssignments = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("az-AZ");

    return assignments.filter((assignment) => {
      const matchesQuery =
        normalizedQuery.length === 0 || getSearchText(assignment).includes(normalizedQuery);
      const matchesFilter =
        filter === "all" ||
        (filter === "custom" && assignment.productLimitOverride !== null) ||
        (filter === "default" &&
          assignment.productLimitOverride === null &&
          assignment.effectiveProductLimit !== null) ||
        (filter === "full" && assignment.remainingProducts !== null && assignment.remainingProducts <= 0) ||
        (filter === "unlimited" && assignment.effectiveProductLimit === null);

      return matchesQuery && matchesFilter;
    });
  }, [assignments, filter, query]);

  return (
    <>
      <div className="grid gap-4">
        <div className="grid gap-3 rounded-xl border bg-background/75 p-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <label className="relative block min-w-0">
            <span className="sr-only">Satıcı axtar</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Satıcı, mağaza, email və ya slug axtar..."
              className="h-11 rounded-xl border border-input bg-card pl-11 pr-4 text-sm font-medium outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </label>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-normal text-muted-foreground">
              <Filter className="size-4" aria-hidden="true" />
              Filter
            </span>
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                className={cn(
                  "h-9 rounded-full border px-3 text-sm font-bold transition-colors",
                  filter === item.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-card text-foreground hover:border-primary/35 hover:bg-secondary",
                )}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="hidden grid-cols-[minmax(12rem,1.2fr)_minmax(12rem,1fr)_repeat(3,minmax(5rem,0.45fr))_auto] gap-3 border-b bg-secondary/70 px-4 py-3 text-xs font-black uppercase tracking-normal text-muted-foreground lg:grid">
            <span>Satıcı / mağaza</span>
            <span>Hesab</span>
            <span>İstifadə</span>
            <span>Limit</span>
            <span>Qalan</span>
            <span className="text-right">Əməliyyat</span>
          </div>
          <div className="divide-y">
            {filteredAssignments.length === 0 ? (
              <div className="grid min-h-48 place-items-center px-4 py-10 text-center">
                <div>
                  <SlidersHorizontal className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-3 text-base font-black">Nəticə tapılmadı</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Axtarış sözünü və ya filteri dəyişib yenidən yoxlayın.
                  </p>
                </div>
              </div>
            ) : (
              filteredAssignments.map((assignment) => (
                <button
                  key={assignment.storeId}
                  type="button"
                  className="grid w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-secondary/60 lg:grid-cols-[minmax(12rem,1.2fr)_minmax(12rem,1fr)_repeat(3,minmax(5rem,0.45fr))_auto] lg:items-center"
                  onClick={() => setSelectedStoreId(assignment.storeId)}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-base font-black">
                      {assignment.storeName}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {assignment.storeSlug ? `/${assignment.storeSlug}` : "Slug yoxdur"}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {assignment.ownerName ?? "Satıcı"}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {assignment.ownerEmail ?? "Email yoxdur"}
                    </span>
                  </span>
                  <span className="grid grid-cols-3 gap-2 text-sm lg:contents">
                    <span className="rounded-lg border bg-background p-2 lg:border-0 lg:bg-transparent lg:p-0">
                      <span className="block text-[11px] font-bold text-muted-foreground lg:hidden">
                        İstifadə
                      </span>
                      <span className="font-black">{assignment.productCount}</span>
                    </span>
                    <span className="rounded-lg border bg-background p-2 lg:border-0 lg:bg-transparent lg:p-0">
                      <span className="block text-[11px] font-bold text-muted-foreground lg:hidden">
                        Limit
                      </span>
                      <span className="font-black">{formatLimit(assignment.effectiveProductLimit)}</span>
                    </span>
                    <span className="rounded-lg border bg-background p-2 lg:border-0 lg:bg-transparent lg:p-0">
                      <span className="block text-[11px] font-bold text-muted-foreground lg:hidden">
                        Qalan
                      </span>
                      <span className="font-black">{formatLimit(assignment.remainingProducts)}</span>
                    </span>
                  </span>
                  <span className="flex items-center justify-between gap-2 lg:justify-end">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-black",
                        assignment.productLimitOverride !== null
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {assignment.productLimitOverride !== null ? "Fərdi" : "Default"}
                    </span>
                    <span className="text-sm font-black text-primary">Düzəlt</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {filteredAssignments.length} / {assignments.length} satıcı göstərilir.
        </p>
      </div>

      {selectedAssignment ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm"
            aria-label="Modalı bağla"
            onClick={() => setSelectedStoreId(null)}
          />
          <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b bg-secondary/70 p-4">
              <div className="min-w-0">
                <p className="truncate text-lg font-black">{selectedAssignment.storeName}</p>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {selectedAssignment.ownerEmail ?? selectedAssignment.ownerName ?? "Satıcı"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 rounded-full"
                onClick={() => setSelectedStoreId(null)}
                aria-label="Bağla"
              >
                <X className="size-5" aria-hidden="true" />
              </Button>
            </div>
            <div className="grid gap-4 p-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border bg-background p-3">
                  <p className="text-xs font-bold text-muted-foreground">İstifadə</p>
                  <p className="mt-1 text-xl font-black">{selectedAssignment.productCount}</p>
                </div>
                <div className="rounded-xl border bg-background p-3">
                  <p className="text-xs font-bold text-muted-foreground">Limit</p>
                  <p className="mt-1 text-xl font-black">
                    {formatLimit(selectedAssignment.effectiveProductLimit)}
                  </p>
                </div>
                <div className="rounded-xl border bg-background p-3">
                  <p className="text-xs font-bold text-muted-foreground">Qalan</p>
                  <p className="mt-1 text-xl font-black">
                    {formatLimit(selectedAssignment.remainingProducts)}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border bg-background p-3">
                <p className="text-sm font-black">Fərdi elan limiti</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Boş saxlananda default limit işləyir: {defaultProductLimit}.
                </p>
                <div className="mt-3">
                  <AdminStoreProductLimitForm
                    assignment={selectedAssignment}
                    defaultProductLimit={defaultProductLimit}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
