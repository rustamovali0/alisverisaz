"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, PackageSearch, Search, Store, Tags, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import type { MarketplaceStore } from "@/lib/cart/types";
import type { CategoryOption } from "@/lib/products/types";
import { cn } from "@/lib/utils";

type MarketplaceSearchProps = {
  stores: MarketplaceStore[];
  categories: CategoryOption[];
  defaultValue?: string;
  className?: string;
  inputClassName?: string;
  buttonSize?: "default" | "lg";
  buttonLabel?: string;
  stackOnMobile?: boolean;
  storeSlug?: string;
};

type SearchSuggestion = {
  key: string;
  label: string;
  description: string;
  href: string;
  type: "store" | "product" | "category";
};

function normalize(value: string) {
  return value
    .toLocaleLowerCase("az-AZ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function suggestionIcon(type: SearchSuggestion["type"]) {
  if (type === "store") {
    return <Store className="size-5 text-primary" aria-hidden="true" />;
  }

  if (type === "category") {
    return <Tags className="size-5 text-primary" aria-hidden="true" />;
  }

  return <PackageSearch className="size-5 text-primary" aria-hidden="true" />;
}

export function MarketplaceSearch({
  stores,
  categories,
  defaultValue = "",
  className,
  inputClassName,
  buttonSize = "default",
  buttonLabel,
  stackOnMobile = false,
  storeSlug,
}: MarketplaceSearchProps) {
  const common = useTranslations("common");
  const marketplace = useTranslations("marketplace");
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);
  const [isFocused, setIsFocused] = useState(false);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const loadedPopularSearches = useRef(false);
  const resolvedButtonLabel = buttonLabel ?? common("search");

  const suggestions = useMemo(() => {
    const categorySuggestions: SearchSuggestion[] = storeSlug ? [] : categories.map((category) => ({
      key: `category-${category.id}`,
      type: "category",
      label: category.name,
      description: marketplace("category"),
      href: `/products?category=${category.slug}`,
    }));
    const scopedStores = storeSlug ? stores.filter((store) => store.slug === storeSlug) : stores;
    const storeSuggestions: SearchSuggestion[] = storeSlug ? [] : scopedStores.map((store) => ({
      key: `store-${store.id}`,
      type: "store",
      label: store.name,
      description: marketplace("productCount", { count: store.productCount }),
      href: `/${store.slug}`,
    }));
    const productSuggestions: SearchSuggestion[] = scopedStores.flatMap((store) =>
      store.sampleProducts.slice(0, 4).map((product) => ({
        key: `product-${product.id}`,
        type: "product" as const,
        label: product.name,
        description: store.name,
        href: `/${store.slug}/products/${product.slug}`,
      })),
    );
    const allSuggestions = [
      ...categorySuggestions,
      ...storeSuggestions,
      ...productSuggestions,
    ];
    const normalizedQuery = normalize(query);

    if (!normalizedQuery) {
      return allSuggestions.slice(0, 7);
    }

    return allSuggestions
      .filter((suggestion) =>
        normalize(`${suggestion.label} ${suggestion.description}`).includes(normalizedQuery),
      )
      .slice(0, 7);
  }, [categories, marketplace, query, storeSlug, stores]);

  useEffect(() => {
    if (!isFocused || query.trim() || loadedPopularSearches.current) {
      return;
    }

    const controller = new AbortController();

    fetch("/api/marketplace/searches", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (controller.signal.aborted || !Array.isArray(payload?.searches)) {
          return;
        }

        setPopularSearches(
          payload.searches
            .filter((term: unknown): term is string => typeof term === "string")
            .slice(0, 4),
        );
        loadedPopularSearches.current = true;
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [isFocused, query]);

  function recordSearch(value: string) {
    const term = value.trim();

    if (term.length < 2) {
      return;
    }

    void fetch("/api/marketplace/searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ term }),
      keepalive: true,
    }).catch(() => undefined);
  }

  function submitSearch(value: string) {
    if (!value) {
      router.push(storeSlug ? `/${storeSlug}` : "/products");
      return;
    }

    const exact = suggestions.find(
      (suggestion) => normalize(suggestion.label) === normalize(value),
    );

    if (exact) {
      router.push(exact.href);
      return;
    }

    recordSearch(value);
    router.push(storeSlug ? `/${storeSlug}?q=${encodeURIComponent(value)}` : `/products?q=${encodeURIComponent(value)}`);
  }

  const showPopularSearches = isFocused && !query.trim() && popularSearches.length > 0;
  const showSuggestions = isFocused && suggestions.length > 0;

  return (
    <form
      autoComplete="off"
      onSubmit={(event) => {
        event.preventDefault();
        submitSearch(query.trim());
      }}
      className={cn(
        "relative flex w-full min-w-0 gap-2",
        stackOnMobile ? "flex-col items-stretch sm:flex-row sm:items-center" : "flex-row items-center",
        className,
      )}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsFocused(false);
        }
      }}
    >
      <label className={cn("relative min-w-0", stackOnMobile ? "w-full sm:flex-1" : "flex-1")}>
        <span className="sr-only">{common("search")}</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <input
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          data-lpignore="true"
          data-form-type="other"
          spellCheck={false}
          className={cn("premium-input h-11 w-full min-w-0 pl-9 pr-3 text-sm", inputClassName)}
          name="marketplace-search"
          placeholder={marketplace("searchPlaceholder")}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsFocused(true)}
        />
      </label>
      <Button
        type="submit"
        size={buttonSize}
        className={cn(stackOnMobile && "hidden w-full sm:inline-flex sm:w-auto")}
      >
        {resolvedButtonLabel}
        {buttonSize === "lg" ? (
          <ArrowRight className="ml-2 size-4" aria-hidden="true" />
        ) : null}
      </Button>
      {showPopularSearches || showSuggestions ? (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-full max-w-full overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-xl">
          {showPopularSearches ? (
            <div className="border-b px-3 py-3 last:border-b-0">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <TrendingUp className="size-4 text-primary" aria-hidden="true" />
                {marketplace("popularSearches")}
              </div>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((term) => (
                  <button
                    key={term}
                    type="button"
                    className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-sm font-medium transition hover:bg-primary hover:text-primary-foreground"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setQuery(term);
                      setIsFocused(false);
                      recordSearch(term);
                      router.push(storeSlug ? `/${storeSlug}?q=${encodeURIComponent(term)}` : `/products?q=${encodeURIComponent(term)}`);
                    }}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {showSuggestions ? suggestions.map((suggestion) => (
              <Link
                key={suggestion.key}
                href={suggestion.href}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition hover:bg-muted"
              >
                <span className="grid size-9 place-items-center rounded-md bg-primary/10">
                  {suggestionIcon(suggestion.type)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{suggestion.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {suggestion.description}
                  </span>
                </span>
              </Link>
            )) : null}
        </div>
      ) : null}
    </form>
  );
}
