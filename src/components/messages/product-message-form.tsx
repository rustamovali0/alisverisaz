"use client";

import { MessageCircle } from "lucide-react";
import { useRef, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import type { AuthRole } from "@/lib/auth/types";
import { createProductMessageAction } from "@/lib/messages/actions";

type ProductMessageFormProps = {
  productId: string;
  storeId: string;
  storeSlug: string;
  viewerRole?: AuthRole | null;
  defaultSenderName?: string;
  defaultSenderPhone?: string;
};

export function ProductMessageForm({
  productId,
  storeId,
  storeSlug,
  viewerRole,
  defaultSenderName = "",
  defaultSenderPhone = "",
}: ProductMessageFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    if (viewerRole !== "customer") {
      void appAlert.info(
        "İstifadəçi hesabı lazımdır",
        "Mesaj göndərmək üçün zəhmət olmasa istifadəçi hesabı ilə giriş edin.",
      );
      return;
    }

    startTransition(async () => {
      const result = await createProductMessageAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Mesaj göndərilmədi");
        return;
      }

      void appAlert.success("Mesaj göndərildi", result.message);
      router.refresh();
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="grid gap-3">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="storeSlug" value={storeSlug} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium">
          Ad Soyad
          <input
            className="premium-input h-11"
            name="senderName"
            defaultValue={defaultSenderName}
            placeholder="Adınızı yazın"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Telefon
          <PhoneInput name="senderPhone" defaultValue={defaultSenderPhone} className="h-11" />
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
