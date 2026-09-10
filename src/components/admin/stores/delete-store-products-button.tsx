"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import { deleteStoreProductsByAdminAction } from "@/lib/products/actions";

type DeleteStoreProductsButtonProps = {
  storeId: string;
  storeName: string;
  productCount: number;
};

export function DeleteStoreProductsButton({
  storeId,
  storeName,
  productCount,
}: DeleteStoreProductsButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDeleteAll() {
    startTransition(async () => {
      const confirmed = await appAlert.confirm({
        title: "Bütün məhsullar silinsin?",
        message: `${storeName} mağazasına bağlı ${productCount} məhsul silinəcək. Bu əməliyyat geri qaytarılmır.`,
        confirmText: "Hamısını sil",
        cancelText: "Ləğv et",
        variant: "danger",
      });

      if (!confirmed.isConfirmed) {
        return;
      }

      const formData = new FormData();
      formData.set("storeId", storeId);
      const result = await deleteStoreProductsByAdminAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Məhsullar silinmədi");
        return;
      }

      void appAlert.success("Məhsullar silindi", result.message);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="destructive"
      onClick={handleDeleteAll}
      disabled={isPending || productCount === 0}
      className="w-full sm:w-auto"
    >
      <Trash2 className="mr-2 size-4" aria-hidden="true" />
      Bütün məhsulları sil
    </Button>
  );
}
