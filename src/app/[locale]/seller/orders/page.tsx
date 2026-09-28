import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function SellerOrdersPage() {
  redirect("/store/dashboard/orders");
}
