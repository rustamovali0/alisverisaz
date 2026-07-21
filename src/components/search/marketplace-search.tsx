"use client";

import { useMemo, useState } from "react";
import { ArrowRight, PackageSearch, Search, Store, Tags } from "lucide-react";

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
  buttonLabel = "Axtar",
}: MarketplaceSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);
  const [isFocused, setIsFocused] = useState(false);

  const suggestions = useMemo(() => {
    const categorySuggestions: SearchSuggestion[] = categories.map((category) => ({
      key: `category-${category.id}`,
      type: "category",
      label: category.name,
      description: "Kateqoriya",
      href: `/products?category=${category.slug}`,
    }));
    const storeSuggestions: SearchSuggestion[] = stores.map((store) => ({
      key: `store-${store.id}`,
      type: "store",
      label: store.name,
      description: `${store.productCount} məhsul`,
      href: `/${store.slug}`,
    }));
    const productSuggestions: SearchSuggestion[] = stores.flatMap((store) =>
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
  }, [categories, query, stores]);

  function submitSearch(value: string) {
    if (!value) {
      router.push("/products");
      return;
    }

    const exact = suggestions.find(
      (suggestion) => normalize(suggestion.label) === normalize(value),
    );

    if (exact) {
      router.push(exact.href);
      return;
    }

    router.push(`/products?q=${encodeURIComponent(value)}`);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submitSearch(query.trim());
      }}
      className={cn("relative flex items-center gap-2", className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsFocused(false);
        }
      }}
    >
      <label className="relative flex-1">
        <span className="sr-only">Axtarış</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          autoComplete="new-password"
          autoCorrect="off"
          spellCheck={false}
          className={cn("premium-input h-11 w-full pl-9 pr-3 text-sm", inputClassName)}
          name="q"
          placeholder="Mağaza, məhsul və kateqoriya axtar"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsFocused(true)}
        />
      </label>
      <Button type="submit" size={buttonSize}>
        {buttonLabel}
        {buttonSize === "lg" ? (
          <ArrowRight className="ml-2 size-4" aria-hidden="true" />
        ) : null}
      </Button>
      {isFocused && suggestions.length > 0 ? (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-full overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-xl">
          {suggestions.map((suggestion) => (
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
          ))}
        </div>
      ) : null}
    </form>
  );
}
