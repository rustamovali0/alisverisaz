"use client";

import { useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { loginAction } from "@/lib/auth/actions";
import { appAlert } from "@/lib/alerts/swal";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthField } from "@/components/auth/auth-field";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const next = searchParams.get("next") ?? "";

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await loginAction(formData);

      if (!result.ok) {
        await appAlert.error(result.message, "Giris alinmadi");
        return;
      }

      await appAlert.success("Xos geldiniz", result.message);
      router.replace(result.redirectTo);
      router.refresh();
    });
  }

  return (
    <AuthCard
      title="Giris"
      description="Hesabiniza daxil olun ve rolunuza uygun panelden davam edin."
      footer={
        <>
          Hesabiniz yoxdur?{" "}
          <Link className="font-medium text-primary hover:underline" href="/register">
            Qeydiyyat
          </Link>
        </>
      }
    >
      <form action={handleSubmit} className="grid gap-4">
        <input name="next" type="hidden" value={next} />
        <AuthField
          id="email"
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
        />
        <AuthField
          id="password"
          name="password"
          label="Sifre"
          type="password"
          autoComplete="current-password"
          required
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? "Yoxlanilir" : "Daxil ol"}
        </Button>
      </form>
    </AuthCard>
  );
}
