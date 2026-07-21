import { AddToCartButton, BuyNowButton } from "@/components/cart/cart-buttons";
import { EmptyState } from "@/components/common/empty-state";
import { DepositModal } from "@/components/deposits/deposit-modal";
import { Link } from "@/i18n/navigation";
import type { CartProduct } from "@/lib/cart/types";

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
      <div className="container py-8">
        <header className="mb-8 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">{labels.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {labels.description}
            </p>
          </div>
          <Link className="text-sm font-medium text-primary hover:underline" href="/cart">
            {labels.cart}
          </Link>
        </header>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {products.map((product) => (
            <article
              key={product.id}
              className="flex flex-col rounded-md border bg-card text-card-foreground shadow-sm"
            >
              <div className="aspect-square overflow-hidden rounded-t-md bg-muted">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h2 className="line-clamp-2 text-base font-semibold tracking-normal">
                  {product.name}
                </h2>
                <p className="mt-2 text-sm font-medium">{formatMoney(product)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
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
