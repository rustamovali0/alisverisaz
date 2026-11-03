import {
  generateMetadata,
  renderStorePage,
  type StorePageProps,
} from "@/components/cart/store-page";

export { generateMetadata };

export default function MarketplaceStoreProductsPage(props: StorePageProps) {
  return renderStorePage(props, { forceMarketplaceRoute: true, productsOnly: true });
}
