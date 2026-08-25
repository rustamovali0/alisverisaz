"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, PackageSearch, Search, Store, TrendingUp, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import type { MarketplaceStore } from "@/lib/cart/types";
import { cn } from "@/lib/utils";

type MarketplaceSearchProps = {
  stores: MarketplaceStore[];
  defaultValue?: string;
  className?: string;
  inputClassName?: string;
  buttonSize?: "default" | "lg";
  buttonLabel?: string;
  stackOnMobile?: boolean;
  storeSlug?: string;
  compactActions?: boolean;
};

type SearchSuggestion = {
  key: string;
  label: string;
  description: string;
  href: string;
  type: "store" | "product";
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

  return <PackageSearch className="size-5 text-primary" aria-hidden="true" />;
}

export function MarketplaceSearch({
  stores,
  defaultValue = "",
  className,
  inputClassName,
  buttonSize = "default",
  buttonLabel,
  stackOnMobile = false,
  storeSlug,
  compactActions = false,
}: MarketplaceSearchProps) {
  const common = useTranslations("common");
  const marketplace = useTranslations("marketplace");
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);
  const [isFocused, setIsFocused] = useState(false);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadedPopularSearches = useRef(false);
  const resolvedButtonLabel = buttonLabel ?? common("search");

  const suggestionGroups = useMemo(() => {
    const scopedStores = storeSlug ? stores.filter((store) => store.slug === storeSlug) : stores;
    const normalizedQuery = normalize(query);

    if (!normalizedQuery) {
      return { stores: [], products: [] };
    }

    const storeSuggestions: SearchSuggestion[] = storeSlug
      ? []
      : scopedStores
          .filter((store) => normalize(store.name).startsWith(normalizedQuery))
          .slice(0, 4)
          .map((store) => ({
            key: `store-${store.id}`,
            type: "store",
            label: store.name,
            description: marketplace("productCount", { count: store.productCount }),
            href: `/${store.slug}`,
          }));
    const productSuggestions: SearchSuggestion[] = scopedStores.flatMap((store) =>
      store.sampleProducts.map((product) => ({
        key: `product-${product.id}`,
        type: "product" as const,
        label: product.name,
        description: store.name,
        href: `/${store.slug}/products/${product.slug}`,
      })),
    );

    return {
      stores: storeSuggestions,
      products: productSuggestions
        .filter((suggestion) => normalize(suggestion.label).startsWith(normalizedQuery))
        .slice(0, 6),
    };
  }, [marketplace, query, storeSlug, stores]);

  const suggestions = useMemo(
    () => [...suggestionGroups.stores, ...suggestionGroups.products],
    [suggestionGroups],
  );

  useEffect(() => {
    if (!isFocused || typeof window === "undefined" || !window.matchMedia("(pointer: coarse)").matches) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFocused]);

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

  function closeMobileSearch() {
    setIsFocused(false);
    inputRef.current?.blur();
  }

  const showPopularSearches = isFocused && !query.trim() && popularSearches.length > 0;
  const showSuggestions = isFocused && query.trim().length > 0 && suggestions.length > 0;
  const showNoResults = isFocused && query.trim().length > 0 && suggestions.length === 0;

  return (
    <form
      autoComplete="off"
      onSubmit={(event) => {
        event.preventDefault();
        submitSearch(query.trim());
      }}
      className={cn(
        "relative flex w-full min-w-0 gap-2",
        "flex-row items-center",
        className,
      )}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsFocused(false);
        }
      }}
    >
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">{common("search")}</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <input
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          data-lpignore="true"
          data-form-type="other"
          ref={inputRef}
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
        className={cn(
          stackOnMobile && "w-auto shrink-0 sm:w-auto",
          compactActions && "size-11 px-0",
        )}
        aria-label={resolvedButtonLabel}
      >
        {compactActions ? <Search className="size-4" aria-hidden="true" /> : resolvedButtonLabel}
        {!compactActions && buttonSize === "lg" ? (
          <ArrowRight className="ml-2 size-4" aria-hidden="true" />
        ) : null}
      </Button>
      {isFocused ? (
        <Button
          type="button"
          variant="ghost"
          size={buttonSize}
          className={cn(
            "shrink-0 md:hidden",
            compactActions && "size-11 px-0",
          )}
          onClick={closeMobileSearch}
          aria-label={common("close")}
        >
          {compactActions ? <X className="size-4" aria-hidden="true" /> : common("close")}
        </Button>
      ) : null}
      {showPopularSearches || showSuggestions || showNoResults ? (
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
          {showSuggestions ? (
            <div className="py-1">
              {suggestionGroups.stores.length > 0 ? (
                <SearchSuggestionGroup
                  label={marketplace("stores")}
                  suggestions={suggestionGroups.stores}
                />
              ) : null}
              {suggestionGroups.products.length > 0 ? (
                <SearchSuggestionGroup
                  label={common("products")}
                  suggestions={suggestionGroups.products}
                />
              ) : null}
            </div>
          ) : null}
          {showNoResults ? (
            <div className="px-4 py-5 text-center text-sm text-muted-foreground">
              {marketplace("noSearchResults")}
            </div>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

function SearchSuggestionGroup({
  label,
  suggestions,
}: {
  label: string;
  suggestions: SearchSuggestion[];
}) {
  return (
    <section className="border-b px-1 py-1 last:border-b-0">
      <p className="px-2 pb-1 pt-1 text-xs font-semibold text-muted-foreground">{label}</p>
      {suggestions.map((suggestion) => (
        <Link
          key={suggestion.key}
          href={suggestion.href}
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition hover:bg-muted"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10">
            {suggestionIcon(suggestion.type)}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">{suggestion.label}</span>
            <span className="block truncate text-xs text-muted-foreground">{suggestion.description}</span>
          </span>
        </Link>
      ))}
    </section>
  );
}
