import { MessageCircle, Star } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { after } from "next/server";

import { AddToCartButton, BuyNowButton } from "@/components/cart/cart-buttons";
import { DepositModal } from "@/components/deposits/deposit-modal";
import { SiteFooter } from "@/components/layout/site-footer";
import { ProductMessageForm } from "@/components/messages/product-message-form";
import {
  ProductBackButton,
  ProductDetailGallery,
} from "@/components/products/product-detail-gallery";
import { ProductReviewForm } from "@/components/reviews/product-review-form";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { trackActivityEvent } from "@/lib/activity/events";
import { getMarketplaceProductById } from "@/lib/cart/data";
import { getSiteSettings } from "@/lib/cms/data";
import { getProductMessagesForProduct } from "@/lib/messages/data";
import { getProductReviews, getReviewSummary } from "@/lib/reviews/data";
import { getDepositSettings } from "@/lib/settings/data";
import { setRequestLocale } from "next-intl/server";

type ProductDetailPageProps = {
  params: Promise<{
    locale: string;
    storeSlug: string;
    productId: string;
  }>;
};

function formatMoney(priceAmount: number, discountAmount: number) {
  return new Intl.NumberFormat("az-AZ", {
    style: "currency",
    currency: "AZN",
  }).format(Math.max(priceAmount - discountAmount, 0));
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { locale, storeSlug, productId } = await params;
  const detail = await getMarketplaceProductById({
    productId,
    locale,
    storeSlug,
  });

  if (!detail) {
    return {};
  }

  return {
    title: `${detail.product.name} | ${detail.store.name}`,
    description: detail.product.description || `${detail.product.name} məhsul detalları.`,
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { locale, storeSlug, productId } = await params;
  setRequestLocale(locale);
  const [detail, depositSettings, siteSettings] = await Promise.all([
    getMarketplaceProductById({
      productId,
      locale,
      storeSlug,
    }),
    getDepositSettings(),
    getSiteSettings(),
  ]);

  if (!detail || detail.store.slug !== storeSlug) {
    notFound();
  }

  const [messages, reviews] = await Promise.all([
    getProductMessagesForProduct(detail.product.id),
    getProductReviews(detail.product.id),
  ]);

  after(() => {
    void trackActivityEvent({
      eventType: "product_view",
      storeId: detail.store.id,
      productId: detail.product.id,
      metadata: {
        title: "Məhsul açıldı",
        description: `${detail.product.name} · ${detail.store.name}`,
        product_name: detail.product.name,
        store_name: detail.store.name,
      },
    });
  });

  const reviewSummary = getReviewSummary(reviews);

  return (
    <main className="min-h-screen bg-muted/40">
      <div className="container py-8">
        <nav className="mb-5 text-sm text-muted-foreground">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <ProductBackButton />
            <div>
              <Link href="/products" className="hover:text-primary">
                Mağazalar
              </Link>
              <span className="mx-2">·</span>
              <Link href={`/${detail.store.slug}`} className="hover:text-primary">
                {detail.store.name}
              </Link>
              <span className="mx-2">·</span>
              <span className="font-medium text-foreground">{detail.product.name}</span>
            </div>
          </div>
        </nav>

        <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <ProductDetailGallery
            images={detail.product.images}
            fallbackImageUrl={detail.product.imageUrl}
            productName={detail.product.name}
          />
          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">{detail.store.name}</p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">
              {detail.product.name}
            </h1>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Star
                    key={value}
                    className={
                      value <= Math.round(reviewSummary.average)
                        ? "size-5 fill-amber-400 text-amber-400"
                        : "size-5 text-muted-foreground"
                    }
                    aria-hidden="true"
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {reviewSummary.count
                  ? `${reviewSummary.average} / 5 (${reviewSummary.count} rəy)`
                  : "Hələ rəy yoxdur"}
              </span>
            </div>
            <p className="mt-5 text-3xl font-black">
              {formatMoney(detail.product.priceAmount, detail.product.discountAmount)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Stok: {detail.product.stockQuantity}
            </p>
            {detail.product.description ? (
              <p className="mt-5 leading-7 text-muted-foreground">
                {detail.product.description}
              </p>
            ) : null}
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <DepositModal product={detail.product} enabled={depositSettings.enabled} />
              <BuyNowButton product={detail.product} />
              <AddToCartButton product={detail.product} />
            </div>
            <div className="mt-5 rounded-lg border bg-background p-4">
              <div className="flex items-center gap-3">
                <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted">
                  {detail.store.logoUrl ? (
                    <img
                      src={detail.store.logoUrl}
                      alt={detail.store.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-black text-muted-foreground">
                      {detail.store.name.slice(0, 1)}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">Mağaza</p>
                  <h2 className="truncate text-base font-black tracking-normal">
                    {detail.store.name}
                  </h2>
                </div>
              </div>
              <Button asChild variant="outline" className="mt-4 w-full">
                <Link href={`/${detail.store.slug}`}>Mağazaya keç</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <MessageCircle className="size-5 text-primary" aria-hidden="true" />
              <h2 className="text-xl font-black tracking-normal">Mesaj / Chat</h2>
            </div>
            <ProductMessageForm
              productId={detail.product.id}
              storeId={detail.store.id}
              storeSlug={detail.store.slug}
            />
            <div className="mt-6 space-y-3">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Mesaj tarixçəniz yoxdur.
                </p>
              ) : (
                messages.map((item) => (
                  <article key={item.id} className="space-y-3 rounded-lg border bg-background p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{item.senderName}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString("az-AZ")}
                      </span>
                    </div>
                    <div className="rounded-lg bg-card p-3 text-sm leading-6 text-muted-foreground">
                      {item.message}
                    </div>
                    {item.replyMessage ? (
                      <div className="ml-auto rounded-lg bg-primary p-3 text-sm leading-6 text-primary-foreground sm:max-w-[85%]">
                        <p className="mb-1 text-xs font-semibold text-primary-foreground/75">
                          Satıcının cavabı
                          {item.replyAt
                            ? ` · ${new Date(item.replyAt).toLocaleString("az-AZ")}`
                            : ""}
                        </p>
                        {item.replyMessage}
                      </div>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Star className="size-5 fill-amber-400 text-amber-400" aria-hidden="true" />
              <h2 className="text-xl font-black tracking-normal">Dəyərləndirmə və rəylər</h2>
            </div>
            <ProductReviewForm productId={detail.product.id} storeSlug={detail.store.slug} />
            <div className="mt-6 space-y-3">
              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Bu məhsula hələ rəy yazılmayıb.
                </p>
              ) : (
                reviews.map((review) => (
                  <article key={review.id} className="rounded-lg border bg-background p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{review.userName}</p>
                        <div className="mt-1 flex">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <Star
                              key={value}
                              className={
                                value <= review.rating
                                  ? "size-4 fill-amber-400 text-amber-400"
                                  : "size-4 text-muted-foreground"
                              }
                              aria-hidden="true"
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString("az-AZ")}
                      </span>
                    </div>
                    {review.comment ? (
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {review.comment}
                      </p>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
      <SiteFooter
        siteName={siteSettings.shortName || siteSettings.siteName}
        description={siteSettings.defaultMetaDescription}
        socialLinks={{
          instagram: siteSettings.socialLinks.instagram,
          tiktok: siteSettings.socialLinks.tiktok,
          whatsapp: siteSettings.socialLinks.whatsapp || siteSettings.whatsapp,
        }}
      />
    </main>
  );
}
