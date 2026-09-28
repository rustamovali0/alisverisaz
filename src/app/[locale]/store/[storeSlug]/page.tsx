import {
  generateMetadata,
  renderStorePage,
  type StorePageProps,
} from "@/components/cart/store-page";

export { generateMetadata };

export default async function MarketplaceStorePage(props: StorePageProps) {
  return renderStorePage(props, { forceMarketplaceRoute: true });
}
