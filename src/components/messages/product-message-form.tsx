"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
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
  allowGuest?: boolean;
};

export function ProductMessageForm({
  productId,
  storeId,
  storeSlug,
  viewerRole,
  defaultSenderName = "",
  allowGuest = false,
}: ProductMessageFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [guestToken, setGuestToken] = useState("");

  useEffect(() => {
    if (!allowGuest || viewerRole) return;
    const key = "alisveris_storefront_guest_id";
    const token = localStorage.getItem(key) || crypto.randomUUID();
    localStorage.setItem(key, token);
    setGuestToken(token);
  }, [allowGuest, viewerRole]);

  function handleSubmit(formData: FormData) {
    if (viewerRole !== "customer" && !allowGuest) {
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
      const messageInput = formRef.current?.elements.namedItem("message");

      if (messageInput instanceof HTMLTextAreaElement) {
        messageInput.value = "";
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="grid gap-2.5 md:gap-3">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="storeSlug" value={storeSlug} />
      <input type="hidden" name="senderName" value={defaultSenderName} />
      <input type="hidden" name="guestToken" value={guestToken} />
      {allowGuest && !viewerRole ? <label className="grid gap-1 text-sm font-medium">Adınız<input className="premium-input h-11" name="guestName" minLength={2} maxLength={80} required /></label> : null}
      <label className="grid gap-1 text-sm font-medium">
        Mesaj
        <textarea
          className="premium-input min-h-20 resize-y py-2.5 md:min-h-28 md:py-3"
          name="message"
          placeholder="Məhsul haqqında sualınızı yazın"
          required
        />
      </label>
      <Button type="submit" disabled={isPending || (allowGuest && !viewerRole && !guestToken)} className="h-10 w-fit px-3 md:h-11 md:px-4">
        <MessageCircle className="mr-2 size-4" aria-hidden="true" />
        {isPending ? "Göndərilir" : "Satıcıya mesaj göndər"}
      </Button>
    </form>
  );
}
