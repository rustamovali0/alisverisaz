"use client";

import { MessageCircle, Send } from "lucide-react";
import { useRef, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/app-alert";
import { createSupportMessageAction } from "@/lib/support/actions";

type SupportMessageFormProps = {
  isAuthenticated?: boolean;
  defaultFullName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
};

export function SupportMessageForm({
  isAuthenticated = false,
  defaultFullName = "",
  defaultEmail = "",
  defaultPhone = "",
}: SupportMessageFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createSupportMessageAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Dəstək mesajı göndərilmədi");
        return;
      }

      formRef.current?.reset();
      void appAlert.success("Mesaj göndərildi", result.message);
    });
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="rounded-md border bg-card p-5 shadow-sm"
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
          <MessageCircle className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-black tracking-normal">Dəstəyə yazın</h2>
          <p className="text-sm text-muted-foreground">
            Dəstək komandamız müraciətinizi qəbul edəcək.
          </p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {isAuthenticated ? (
          <>
            <input type="hidden" name="fullName" value={defaultFullName} />
            <input type="hidden" name="email" value={defaultEmail} />
            <input type="hidden" name="phone" value={defaultPhone} />
          </>
        ) : (
          <>
            <input
              aria-label="Ad Soyad"
              name="fullName"
              placeholder="Ad Soyad"
              className="h-11 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <input
              aria-label="Email"
              name="email"
              type="email"
              placeholder="Email"
              className="h-11 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <input
              aria-label="Telefon"
              name="phone"
              placeholder="Telefon"
              className="h-11 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </>
        )}
        <input
          aria-label="Mövzu"
          name="subject"
          placeholder="Mövzu"
          required
          className="h-11 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <textarea
        aria-label="Mesaj"
        name="message"
        required
        minLength={10}
        placeholder="Mesajınızı yazın"
        className="mt-3 min-h-32 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <Button type="submit" className="mt-3" disabled={isPending}>
        <Send className="mr-2 size-4" />
        {isPending ? "Göndərilir..." : "Dəstəyə göndər"}
      </Button>
    </form>
  );
}
