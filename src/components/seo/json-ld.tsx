import type {
  MarketplaceProductDetail,
  MarketplaceStore,
} from "@/lib/cart/types";
import { siteConfig } from "@/lib/config/site";

type JsonLdProps = {
  data: Record<string, unknown>;
};

function sanitizeJsonLd(data: Record<string, unknown>) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function absoluteUrl(value?: string | null) {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value).toString();
  } catch {
    return `${siteConfig.url}${value.startsWith("/") ? value : `/${value}`}`;
  }
}

function compact<T>(values: Array<T | null | undefined | false>) {
  return values.filter(Boolean) as T[];
}

function socialUrl(kind: "instagram" | "tiktok", value?: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    const handle = trimmed.replace(/^@/, "");

    return kind === "instagram"
      ? `https://www.instagram.com/${handle}`
      : `https://www.tiktok.com/@${handle}`;
  }
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: sanitizeJsonLd(data) }}
    />
  );
}

export function ProductJsonLd({
  detail,
  url,
}: {
  detail: MarketplaceProductDetail;
  url: string;
}) {
  const product = detail.product;
  const price = Math.max(0, product.priceAmount - product.discountAmount);
  const images = Array.from(
    new Set(
      compact([product.imageUrl, ...product.images.map((image) => image.url)])
        .map(absoluteUrl)
        .filter(Boolean) as string[],
    ),
  );

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.description || `${product.name} məhsul detalları.`,
        image: images.length ? images : undefined,
        sku: product.id,
        brand: {
          "@type": "Brand",
          name: detail.store.name,
        },
        offers: {
          "@type": "Offer",
          url,
          priceCurrency: "AZN",
          price: Number(price.toFixed(2)),
          availability:
            product.stockQuantity > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
          seller: {
            "@type": "Organization",
            name: detail.store.name,
            url: `${siteConfig.url}/store/${detail.store.slug}`,
          },
        },
      }}
    />
  );
}

export function StoreJsonLd({
  store,
  url,
}: {
  store: MarketplaceStore;
  url: string;
}) {
  const sameAs = compact([
    socialUrl("instagram", store.socialInstagram),
    socialUrl("tiktok", store.socialTiktok),
  ]);

  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": ["Store", "LocalBusiness"],
        name: store.name,
        description: store.description || `${store.name} mağazası Alisveris.az-da.`,
        url,
        image: absoluteUrl(store.coverUrl) || absoluteUrl(store.logoUrl),
        logo: absoluteUrl(store.logoUrl),
        telephone: store.phone || undefined,
        address: store.address
          ? {
              "@type": "PostalAddress",
              streetAddress: store.address,
              addressCountry: "AZ",
            }
          : undefined,
        sameAs: sameAs.length ? sameAs : undefined,
      }}
    />
  );
}
