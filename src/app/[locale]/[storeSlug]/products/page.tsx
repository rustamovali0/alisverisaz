import { renderStorePage, type StorePageProps } from "@/components/cart/store-page";

export default async function StoreProductsPage(props: StorePageProps) {
  return renderStorePage(props, { productsOnly: true });
}
