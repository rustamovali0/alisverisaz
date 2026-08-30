"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { updateCustomerProfileAction } from "@/lib/auth/actions";
import { appAlert } from "@/lib/alerts/app-alert";

type CustomerProfileFormProps = {
  fullName: string;
  email: string;
  phone: string;
};

export function CustomerProfileForm({
  fullName,
  email,
  phone,
}: CustomerProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [phoneValue, setPhoneValue] = useState(phone.replace(/^\+994\s?/, ""));

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateCustomerProfileAction(formData);

      if (!result.ok) {
        void appAlert.error(result.message, "Profil yenilənmədi");
        return;
      }

      void appAlert.success("Profil yeniləndi", result.message);
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Ad soyad
          <input
            name="fullName"
            defaultValue={fullName}
            className="premium-input h-12 px-4"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Email
          <input
            name="email"
            type="email"
            defaultValue={email}
            className="premium-input h-12 px-4"
            required
          />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-medium md:max-w-md">
        Telefon
        <span className="flex h-12 overflow-hidden rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring">
          <span className="grid w-20 place-items-center border-r bg-muted text-muted-foreground">
            +994
          </span>
          <input
            name="phone"
            value={phoneValue}
            onChange={(event) => setPhoneValue(event.target.value)}
            className="min-w-0 flex-1 bg-transparent px-4 outline-none"
            placeholder="77 666 44 33"
            required
          />
        </span>
      </label>
      <div>
        <Button type="submit" disabled={isPending}>
          <Save className="mr-2 size-4" aria-hidden="true" />
          {isPending ? "Yadda saxlanılır" : "Yadda saxla"}
        </Button>
      </div>
    </form>
  );
}
