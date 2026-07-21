"use client";

import { MessageCircle } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/swal";
import { createProductMessageAction } from "@/lib/messages/actions";

type ProductMessageFormProps = {
  productId: string;
  storeId: string;
  storeSlug: string;
};

export function ProductMessageForm({
  productId,
  storeId,
  storeSlug,
}: ProductMessageFormProps) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createProductMessageAction(formData);

      if (!result.ok) {
        await appAlert.error(result.message, "Mesaj göndərilmədi");
        return;
      }

      await appAlert.success("Mesaj göndərildi", result.message);
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-3">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="storeSlug" value={storeSlug} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          Ad Soyad
          <input
            className="premium-input h-11"
            name="senderName"
            placeholder="Adınızı yazın"
            required
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Telefon
          <input
            className="premium-input h-11"
            name="senderPhone"
            placeholder="+994..."
          />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-medium">
        Mesaj
        <textarea
          className="premium-input min-h-28 resize-y py-3"
          name="message"
          placeholder="Məhsul haqqında sualınızı yazın"
          required
        />
      </label>
      <Button type="submit" disabled={isPending} className="w-fit">
        <MessageCircle className="mr-2 size-4" aria-hidden="true" />
        {isPending ? "Göndərilir" : "Satıcıya mesaj göndər"}
      </Button>
    </form>
  );
}
