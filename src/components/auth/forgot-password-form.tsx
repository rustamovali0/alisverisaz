"use client";

import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import { type FormEvent, useState } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthErrorAlert } from "@/components/auth/auth-error-alert";
import { AuthField } from "@/components/auth/auth-field";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import { requestPasswordResetAction } from "@/lib/auth/actions";

export function ForgotPasswordForm() {
  const [identifier, setIdentifier] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setServerError(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData(event.currentTarget);
      formData.set("identifier", identifier.trim().toLowerCase());
      const result = await requestPasswordResetAction(formData);

      if (!result.ok) {
        setServerError(result.message);
        void appAlert.error(result.message, "Link göndərilmədi");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(result.message);
      void appAlert.success("Bərpa linki göndərildi", result.message, {
        dedupeKey: "password-reset-sent",
        persistAcrossNavigation: true,
      });

      window.setTimeout(() => {
        window.location.assign(result.redirectTo || "/login");
      }, 1200);
    } catch {
      const message = "Bərpa emaili göndərilmədi. Bir az sonra yenidən yoxlayın.";
      setServerError(message);
      setIsSubmitting(false);
      void appAlert.error(message, "Link göndərilmədi");
    }
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
      <form onSubmit={handleSubmit} className="grid gap-4">
        <AuthErrorAlert message={serverError} />
        {successMessage ? (
          <div
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200"
            role="status"
          >
            {successMessage}
          </div>
        ) : null}
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
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-xl"
        >
          <Mail className="mr-2 size-4" aria-hidden="true" />
          {isSubmitting ? "Göndərilir" : "Bərpa linki göndər"}
        </Button>
      </form>
    </AuthCard>
  );
}
