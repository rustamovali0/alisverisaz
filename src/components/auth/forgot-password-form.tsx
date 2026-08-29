"use client";

import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import { useState, useTransition } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthErrorAlert } from "@/components/auth/auth-error-alert";
import { AuthField } from "@/components/auth/auth-field";
import { TurnstileField } from "@/components/auth/turnstile-field";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import { requestPasswordResetAction } from "@/lib/auth/actions";

export function ForgotPasswordForm({ turnstileSiteKey = "" }: { turnstileSiteKey?: string }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    if (!captchaToken) {
      const message = "Təhlükəsizlik yoxlamasını tamamlayın.";
      setServerError(message);
      void appAlert.error(message, "Link göndərilmədi");
      return;
    }

    startTransition(async () => {
      try {
        formData.set("identifier", identifier.trim().toLowerCase());
        formData.set("captchaToken", captchaToken);
        const result = await requestPasswordResetAction(formData);

        if (!result.ok) {
          setCaptchaToken("");
          setServerError(result.message);
          void appAlert.error(result.message, "Link göndərilmədi");
          return;
        }

        void appAlert.success("Email göndərildi", result.message);
        router.replace(result.redirectTo);
        router.refresh();
      } catch {
        const message = "Bərpa emaili göndərilmədi. Bir az sonra yenidən yoxlayın.";
        setCaptchaToken("");
        setServerError(message);
        void appAlert.error(message, "Link göndərilmədi");
      }
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
        <Button asChild variant="outline" size="sm" className="h-10 px-2 text-sm">
          <Link href="/register">
            Qeydiyyat
            <ArrowRight className="ml-2 size-4" aria-hidden="true" />
          </Link>
        </Button>
      }
      title="Şifrəni unutdum"
      description="Hesabınıza bağlı email ünvanını yazın, bərpa linki göndərək."
      footer={
        <p>
          Yenə də giriş edə bilirsinizsə{" "}
          <Link className="font-medium text-primary hover:underline" href="/login">
            login səhifəsinə qayıdın
          </Link>
          .
        </p>
      }
    >
      <form action={handleSubmit} className="grid gap-4">
        <AuthErrorAlert message={serverError} />
        <AuthField
          id="identifier"
          name="identifier"
          label="Email"
          type="email"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value.toLowerCase())}
          inputMode="email"
          hint="Hesabınıza bağlı email ünvanını daxil edin."
          autoComplete="email"
          required
        />
        <TurnstileField
          token={captchaToken}
          onTokenChange={setCaptchaToken}
          siteKey={turnstileSiteKey}
        />
        <Button
          type="submit"
          disabled={isPending || !captchaToken}
          className="h-12 w-full rounded-xl"
        >
          <Mail className="mr-2 size-4" aria-hidden="true" />
          {isPending ? "Göndərilir" : "Bərpa linki göndər"}
        </Button>
      </form>
    </AuthCard>
  );
}
