"use client";

import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { useState, useTransition } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthErrorAlert } from "@/components/auth/auth-error-alert";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import { updatePasswordAction } from "@/lib/auth/actions";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      formData.set("password", password);
      formData.set("confirmPassword", confirmPassword);
      const result = await updatePasswordAction(formData);

      if (!result.ok) {
        setServerError(result.message);
        void appAlert.error(result.message, "Şifrə yenilənmədi");
        return;
      }

      void appAlert.success("Şifrə yeniləndi", result.message);
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <AuthCard
      className="mx-auto max-w-[520px]"
      topStart={
        <Button asChild variant="ghost" size="sm" className="h-10 px-2 text-sm">
          <Link href="/login">
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Girişə qayıt
          </Link>
        </Button>
      }
      topEnd={
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Təhlükəsiz
        </div>
      }
      title="Şifrəni yenilə"
      description="Yeni şifrənizi yazın və hesabınızı yenidən aktiv edin."
      footer={
        <p>
          Problem davam edirsə{" "}
          <Link className="font-medium text-primary hover:underline" href="/forgot-password">
            yenidən link istəyin
          </Link>
          .
        </p>
      }
    >
      <form action={handleSubmit} className="grid gap-4">
        <AuthErrorAlert message={serverError} />
        <PasswordInput
          id="password"
          name="password"
          label="Yeni şifrə"
          autoComplete="new-password"
          value={password}
          onValueChange={setPassword}
          minLength={8}
          required
        />
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          label="Şifrənin təkrarı"
          autoComplete="new-password"
          value={confirmPassword}
          onValueChange={setConfirmPassword}
          minLength={8}
          required
        />
        <Button type="submit" disabled={isPending} className="h-12 w-full rounded-xl">
          {isPending ? "Yenilənir" : "Şifrəni yenilə"}
        </Button>
      </form>
    </AuthCard>
  );
}
