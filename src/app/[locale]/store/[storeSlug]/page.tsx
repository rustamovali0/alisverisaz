import {
  generateMetadata,
  renderStorePage,
  type StorePageProps,
} from "../../[storeSlug]/page";

export { generateMetadata };

export default async function MarketplaceStorePage(props: StorePageProps) {
  return renderStorePage(props, { forceMarketplaceRoute: true });
}
