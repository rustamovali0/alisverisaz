import { redirect } from "@/i18n/navigation";
export default async function Page({ params }: { params: Promise<{ locale: string; productId: string }> }) {
  const { locale, productId } = await params;
  redirect({ href: `/sell/product/${productId}/edit`, locale });
}
