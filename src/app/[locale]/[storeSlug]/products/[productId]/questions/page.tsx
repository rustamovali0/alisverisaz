import { ArrowLeft, MessageCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { ProductMessageForm } from "@/components/messages/product-message-form";
import { ProductMessageThread } from "@/components/products/product-feedback-lists";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getMarketplaceProductById } from "@/lib/cart/data";
import { getProductMessagesForProduct } from "@/lib/messages/data";

type ProductQuestionsPageProps = {
  params: Promise<{
    locale: string;
    storeSlug: string;
    productId: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ProductQuestionsPage({ params }: ProductQuestionsPageProps) {
  const { locale, storeSlug, productId } = await params;
  setRequestLocale(locale);

  const [detail, current] = await Promise.all([
    getMarketplaceProductById({ productId, locale, storeSlug }),
    getCurrentUserProfile(),
  ]);

  if (!detail || detail.store.slug !== storeSlug) {
    notFound();
  }

  const messages = await getProductMessagesForProduct(detail.product.id);
  const productHref = `/${detail.store.slug}/products/${detail.product.slug}`;

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-clip bg-muted/40 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8">
      <div className="container max-w-3xl py-5 md:py-8">
        <Button asChild variant="ghost" className="mb-4 h-10 px-2 text-muted-foreground hover:text-foreground">
          <Link href={productHref}>
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Məhsula qayıt
          </Link>
        </Button>

        <section className="min-w-0 rounded-xl border bg-card p-4 shadow-sm md:p-6">
          <div className="mb-5 flex min-w-0 items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <MessageCircle className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm text-muted-foreground">{detail.product.name}</p>
              <h1 className="text-xl font-black tracking-normal md:text-2xl">Sual & Cavablar</h1>
              <p className="mt-1 text-sm text-muted-foreground">Məhsul haqqında sualınızı satıcıya göndərin.</p>
            </div>
          </div>

          <ProductMessageForm
            productId={detail.product.id}
            storeId={detail.store.id}
            storeSlug={detail.store.slug}
            viewerRole={current?.role ?? null}
            defaultSenderName={current?.profile?.full_name ?? current?.user.email ?? ""}
          />
          <ProductMessageThread messages={messages} />
        </section>
      </div>
    </main>
  );
}
