import { renderStorePage, type StorePageProps } from "@/components/cart/store-page";

export default async function StoreContactPage(props: StorePageProps) {
  return renderStorePage(props, { contactOnly: true });
}
