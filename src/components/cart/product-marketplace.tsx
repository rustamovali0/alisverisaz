import { AddToCartButton, BuyNowButton } from "@/components/cart/cart-buttons";
import { EmptyState } from "@/components/common/empty-state";
import { DepositModal } from "@/components/deposits/deposit-modal";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { CartProduct } from "@/lib/cart/types";
import { Heart, Search, ShoppingCart } from "lucide-react";

type ProductMarketplaceProps = {
  products: CartProduct[];
  depositEnabled: boolean;
  labels: {
    title: string;
    description: string;
    emptyTitle: string;
    emptyDescription: string;
    stock: string;
    cart: string;
  };
};

function formatMoney(product: CartProduct) {
  const value = Math.max(product.priceAmount - product.discountAmount, 0);

  return new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency: "AZN",
  }).format(value);
}

export function ProductMarketplace({
  products,
  depositEnabled,
  labels,
}: ProductMarketplaceProps) {
  if (products.length === 0) {
    return (
      <EmptyState
        className="min-h-96"
        title={labels.emptyTitle}
        description={labels.emptyDescription}
      />
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="container flex h-16 items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-lg bg-primary text-lg font-black text-primary-foreground">
              a
            </span>
            <span className="text-xl font-black tracking-normal">alisveris.az</span>
          </Link>
          <form className="hidden flex-1 md:block">
            <label className="relative block">
              <span className="sr-only">Axtarış</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="premium-input h-11 w-full pl-9 pr-3 text-sm"
                placeholder="Məhsul, mağaza və kateqoriya axtar"
                type="search"
              />
            </label>
          </form>
          <Button asChild size="icon" variant="ghost" aria-label="Favorilər">
            <Link href="/dashboard/favorites">
              <Heart className="size-5" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild>
            <Link href="/cart">
              <ShoppingCart className="mr-2 size-4" aria-hidden="true" />
              {labels.cart}
            </Link>
          </Button>
        </div>
      </header>
      <div className="container py-8">
        <header className="mb-8 flex flex-col gap-4 rounded-lg border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-normal">{labels.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {labels.description}
            </p>
          </div>
          <span className="rounded-md border bg-background px-3 py-2 text-sm font-semibold text-muted-foreground">
            {products.length} aktiv məhsul
          </span>
        </header>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {products.map((product) => (
            <article
              key={product.id}
              className="group flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-slate-900/10"
            >
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col p-3">
                <h2 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 tracking-normal">
                  {product.name}
                </h2>
                <p className="mt-2 text-base font-bold">{formatMoney(product)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {labels.stock}: {product.stockQuantity}
                </p>
                <div className="mt-4 grid gap-2">
                  <DepositModal product={product} enabled={depositEnabled} />
                  <BuyNowButton product={product} />
                  <AddToCartButton product={product} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
