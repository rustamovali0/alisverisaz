"use client";

import { useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { loginAction } from "@/lib/auth/actions";
import { appAlert } from "@/lib/alerts/swal";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthField } from "@/components/auth/auth-field";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";

type LoginFormProps = {
  mode?: "public" | "admin";
};

export function LoginForm({ mode = "public" }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const next = searchParams.get("next") ?? "";

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await loginAction(formData);

      if (!result.ok) {
        await appAlert.error(result.message, "Giriş alınmadı");
        return;
      }

      await appAlert.success("Xoş gəldiniz", result.message);
      router.replace(result.redirectTo);
      router.refresh();
    });
  }

  return (
    <AuthCard
      title={mode === "admin" ? "Admin girişi" : "Giriş"}
      description={
        mode === "admin"
          ? "Admin panelinə yalnız admin rolu olan hesab daxil ola bilər."
          : "Müştəri və ya mağaza hesabınıza daxil olun."
      }
      footer={
        mode === "admin" ? (
          <Link className="font-medium text-primary hover:underline" href="/login">
            Sayt girişinə qayıt
          </Link>
        ) : (
          <>
            Hesabınız yoxdur?{" "}
            <Link className="font-medium text-primary hover:underline" href="/register">
              Qeydiyyat
            </Link>
          </>
        )
      }
    >
      <form action={handleSubmit} className="grid gap-4">
        <input name="next" type="hidden" value={next} />
        <input name="mode" type="hidden" value={mode} />
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
          label="Şifrə"
          type="password"
          autoComplete="current-password"
          required
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? "Yoxlanılır" : "Daxil ol"}
        </Button>
      </form>
    </AuthCard>
  );
}
