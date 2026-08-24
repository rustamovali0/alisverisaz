"use client";

import { ArrowLeft, ArrowRight, Chrome } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthErrorAlert } from "@/components/auth/auth-error-alert";
import { AuthField } from "@/components/auth/auth-field";
import { PasswordInput } from "@/components/auth/password-input";
import { TurnstileField } from "@/components/auth/turnstile-field";
import { Button } from "@/components/ui/button";
import { googleOAuthAction, loginAction } from "@/lib/auth/actions";
import { appAlert } from "@/lib/alerts/app-alert";
import { Link } from "@/i18n/navigation";

type LoginFormProps = {
  mode?: "public" | "admin";
  turnstileSiteKey?: string;
};

type FieldErrors = {
  identifier?: string;
  password?: string;
};

function getInitialIdentifier(params: URLSearchParams) {
  return params.get("email") ?? params.get("identifier") ?? "";
}

export function LoginForm({ mode = "public", turnstileSiteKey = "" }: LoginFormProps) {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isGooglePending, startGoogleTransition] = useTransition();
  const [identifier, setIdentifier] = useState(() => getInitialIdentifier(searchParams));
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [captchaToken, setCaptchaToken] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const next = searchParams.get("next") ?? "";

  const visualLabel = useMemo(
    () =>
      mode === "admin"
        ? "Admin panelinə giriş"
        : "Hesabınıza daxil olmaq üçün məlumatlarınızı daxil edin.",
    [mode],
  );

  function validate() {
    const nextErrors: FieldErrors = {};

    if (!identifier.trim()) {
      nextErrors.identifier = "Email və ya telefon daxil edin.";
    }

    if (!password.trim()) {
      nextErrors.password = "Şifrə daxil edin.";
    }

    setFieldErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(formData: FormData) {
    if (isPending) {
      return;
    }

    setServerError(null);

    if (!validate()) {
      return;
    }

    formData.set("identifier", identifier.trim());
    formData.set("password", password);
    formData.set("rememberMe", rememberMe ? "on" : "");
    formData.set("next", next);
    formData.set("mode", mode);
    formData.set("captchaToken", captchaToken);

    startTransition(async () => {
      const result = await loginAction(formData);

      if (!result.ok) {
        setCaptchaToken("");
        setServerError(result.message);
        void appAlert.error(result.message, "Giriş alınmadı");
        return;
      }

      void appAlert.success("Xoş gəldiniz", result.message);
      window.location.assign(result.redirectTo);
    });
  }

  function handleGoogleSubmit(formData: FormData) {
    if (isGooglePending) {
      return;
    }

    formData.set("next", next);
    formData.set("mode", mode);
    formData.set("captchaToken", captchaToken);
    setServerError(null);

    startGoogleTransition(async () => {
      const result = await googleOAuthAction(formData);

      if (!result.ok) {
        setCaptchaToken("");
        setServerError(result.message);
        void appAlert.error(result.message, "Google girişi alınmadı");
        return;
      }

      window.location.assign(result.redirectTo);
    });
  }

  return (
    <AuthCard
      className="mx-auto max-w-[520px]"
      topStart={
        <Button asChild variant="ghost" size="sm" className="h-10 px-2 text-sm">
          <Link href="/">
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Geri
          </Link>
        </Button>
      }
      topEnd={
        mode === "admin" ? (
          <Button asChild variant="ghost" size="sm" className="h-10 px-2 text-sm">
            <Link href="/login">Sayt girişi</Link>
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm" className="h-10 px-2 text-sm">
            <Link href="/register">
              Qeydiyyat
              <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </Link>
          </Button>
        )
      }
      title={mode === "admin" ? "RAdmin girişi" : "Giriş"}
      description={visualLabel}
      footer={
        <div className="space-y-3">
          {mode === "public" ? (
            <p>
              Hesabınız yoxdur?{" "}
              <Link className="font-medium text-primary hover:underline" href="/register">
                Qeydiyyat
              </Link>
            </p>
          ) : (
            <p>
              Sayt girişinə keçmək üçün{" "}
              <Link className="font-medium text-primary hover:underline" href="/login">
                public login
              </Link>{" "}
              səhifəsindən istifadə edin.
            </p>
          )}
          <Link className="font-medium text-primary hover:underline" href="/">
            Ana səhifəyə qayıt
          </Link>
        </div>
      }
    >
      <form action={handleSubmit} className="grid gap-4">
        <input name="next" type="hidden" value={next} />
        <input name="mode" type="hidden" value={mode} />
        <AuthErrorAlert message={serverError} />
        <AuthField
          id="identifier"
          name="identifier"
          label="Email və ya telefon"
          type="text"
          autoComplete="username"
          inputMode="text"
          value={identifier}
          onChange={(event) => {
            setIdentifier(event.target.value);
            setFieldErrors((current) => ({ ...current, identifier: undefined }));
          }}
          hint="Hesabınıza bağlı email və ya telefon nömrəsi."
          error={fieldErrors.identifier}
          required
        />
        <PasswordInput
          id="password"
          name="password"
          label="Şifrə"
          autoComplete="current-password"
          value={password}
          onValueChange={(value) => {
            setPassword(value);
            setFieldErrors((current) => ({ ...current, password: undefined }));
          }}
          error={fieldErrors.password}
          required
        />
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <label className="flex items-center gap-2 font-medium text-foreground">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="size-4 rounded border-input"
            />
            Məni xatırla
          </label>
          <Link className="font-medium text-primary hover:underline" href="/forgot-password">
            Şifrəni unutmusunuz?
          </Link>
        </div>
        <TurnstileField
          token={captchaToken}
          onTokenChange={setCaptchaToken}
          siteKey={turnstileSiteKey}
        />
        <Button type="submit" disabled={isPending} className="h-12 w-full rounded-xl">
          {isPending ? "Daxil olunur" : "Daxil ol"}
        </Button>
      </form>

      {mode === "public" ? (
        <>
          <AuthDivider />

          <form action={handleGoogleSubmit} className="grid gap-3">
            <input name="next" type="hidden" value={next} />
            <input name="mode" type="hidden" value={mode} />
            <Button
              type="submit"
              variant="outline"
              className="h-12 w-full rounded-xl"
              disabled={isGooglePending}
            >
              <Chrome className="mr-2 size-4" aria-hidden="true" />
              {isGooglePending ? "Google açılır" : "Google ilə davam et"}
            </Button>
          </form>
        </>
      ) : null}
    </AuthCard>
  );
}
