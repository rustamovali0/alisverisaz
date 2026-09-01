"use client";

import { ArrowLeft, ArrowRight, Chrome } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthField } from "@/components/auth/auth-field";
import { PasswordInput } from "@/components/auth/password-input";
import { TurnstileField } from "@/components/auth/turnstile-field";
import { Button } from "@/components/ui/button";
import { googleOAuthAction, loginAction } from "@/lib/auth/actions";
import { appAlert } from "@/lib/alerts/app-alert";
import { clearClientAuthProfileCache } from "@/lib/auth/use-client-auth-profile";
import { showToast } from "@/lib/toast";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type LoginFormProps = {
  mode?: "public" | "admin";
  turnstileSiteKey?: string;
};

type FieldErrors = {
  identifier?: string;
  password?: string;
};

function getInitialIdentifier(params: URLSearchParams) {
  return (params.get("email") ?? params.get("identifier") ?? "").toLowerCase();
}

export function LoginForm({ mode = "public", turnstileSiteKey = "" }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isGooglePending, startGoogleTransition] = useTransition();
  const [identifier, setIdentifier] = useState(() => getInitialIdentifier(searchParams));
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [captchaToken, setCaptchaToken] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const next = searchParams.get("next") ?? "";
  const isAdminMode = mode === "admin";

  const visualLabel = useMemo(
    () => (mode === "admin" ? "Admin panelinə giriş" : ""),
    [mode],
  );

  function validate() {
    const nextErrors: FieldErrors = {};

    if (!identifier.trim()) {
      nextErrors.identifier = "Email daxil edin.";
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

    if (!validate()) {
      return;
    }

    if (!isAdminMode && !captchaToken) {
      const message = "Təhlükəsizlik yoxlamasını tamamlayın.";
      showToast({ title: "Giriş alınmadı", description: message, variant: "error" });
      return;
    }

    formData.set("identifier", identifier.trim().toLowerCase());
    formData.set("password", password);
    formData.set("rememberMe", rememberMe ? "on" : "");
    formData.set("next", next);
    formData.set("mode", mode);
    formData.set("captchaToken", captchaToken);

    startTransition(async () => {
      let result;

      try {
        result = await loginAction(formData);
      } catch {
        const message = "Giriş zamanı texniki xəta baş verdi. Yenidən cəhd edin.";
        setCaptchaToken("");
        showToast({ title: "Giriş alınmadı", description: message, variant: "error" });
        return;
      }

      if (!result.ok) {
        setCaptchaToken("");
        showToast({ title: "Giriş alınmadı", description: result.message, variant: "error" });
        return;
      }

      void appAlert.success("Xoş gəldiniz", "Giriş uğurla tamamlandı.", {
        dedupeKey: "login-success",
      });
      clearClientAuthProfileCache();
      router.replace(result.redirectTo);
      router.refresh();
    });
  }

  function handleGoogleSubmit(formData: FormData) {
    if (isGooglePending) {
      return;
    }

    if (!captchaToken) {
      const message = "Təhlükəsizlik yoxlamasını tamamlayın.";
      showToast({ title: "Google girişi alınmadı", description: message, variant: "error" });
      return;
    }

    formData.set("next", next);
    formData.set("mode", mode);
    formData.set("captchaToken", captchaToken);
    startGoogleTransition(async () => {
      const result = await googleOAuthAction(formData);

      if (!result.ok) {
        setCaptchaToken("");
        showToast({ title: "Google girişi alınmadı", description: result.message, variant: "error" });
        return;
      }

      window.location.assign(result.redirectTo);
    });
  }

  return (
    <AuthCard
      className={cn(
        "mx-auto max-w-[520px] rounded-2xl border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        isAdminMode &&
          "border-emerald-500/25 bg-black/72 p-4 text-emerald-50 shadow-2xl shadow-emerald-950/40 backdrop-blur-xl sm:p-5 [&_input]:border-emerald-500/25 [&_input]:bg-black/45 [&_input]:font-mono [&_input]:text-emerald-100 [&_input]:placeholder:text-emerald-400/50 [&_input]:focus-visible:border-emerald-400 [&_input]:focus-visible:ring-emerald-400/25",
      )}
      topStart={
        <Button asChild variant="ghost" size="sm" className="h-10 px-2 text-sm">
          <Link href="/">
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Ana səhifə
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
      title={mode === "admin" ? "Admin giriş" : "Giriş"}
      description={visualLabel}
      footer={
        mode === "public" ? (
          <div className="space-y-3">
            <Link className="font-medium text-primary hover:underline" href="/">
              Ana səhifəyə qayıt
            </Link>
          </div>
        ) : null
      }
    >
      <form action={handleSubmit} className={cn("grid gap-3", isAdminMode && "gap-2.5")}>
        <input name="next" type="hidden" value={next} />
        <input name="mode" type="hidden" value={mode} />
        <AuthField
          id="identifier"
          name="identifier"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={identifier}
          onChange={(event) => {
            setIdentifier(event.target.value.toLowerCase());
            setFieldErrors((current) => ({ ...current, identifier: undefined }));
          }}
          hint={undefined}
          error={fieldErrors.identifier}
          className={isAdminMode ? "gap-1 text-[13px]" : undefined}
          inputClassName={isAdminMode ? "h-10 rounded-lg px-3" : undefined}
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
          className={isAdminMode ? "gap-1 text-[13px]" : undefined}
          inputClassName={isAdminMode ? "h-10 rounded-lg px-3 pr-10" : undefined}
          toggleClassName={
            isAdminMode
              ? "right-1.5 size-8 text-emerald-200 hover:text-emerald-100 [&_svg]:size-5"
              : undefined
          }
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
          {mode === "public" ? (
            <Link className="font-medium text-primary hover:underline" href="/forgot-password">
              Şifrəni unutmusunuz?
            </Link>
          ) : null}
        </div>
        {isAdminMode ? <input type="hidden" name="captchaToken" value="" /> : (
          <TurnstileField
            token={captchaToken}
            onTokenChange={setCaptchaToken}
            siteKey={turnstileSiteKey}
          />
        )}
        <Button
          type="submit"
          disabled={isPending || (!isAdminMode && !captchaToken)}
          className={cn(
            "h-11 w-full rounded-[10px] bg-blue-600 font-semibold text-white shadow-none hover:bg-blue-700",
            isAdminMode &&
              "h-10 rounded-lg bg-emerald-400 font-black text-slate-950 shadow-lg shadow-emerald-500/15 hover:bg-emerald-300",
          )}
        >
          {isPending ? "Daxil olunur" : "Daxil ol"}
        </Button>
      </form>

      {mode === "public" ? (
        <div className="hidden" aria-hidden="true">
          <AuthDivider />

          <form action={handleGoogleSubmit} className="grid gap-3">
            <input name="next" type="hidden" value={next} />
            <input name="mode" type="hidden" value={mode} />
            <Button
              type="submit"
              variant="outline"
              className="h-11 w-full rounded-xl"
              disabled={isGooglePending || !captchaToken}
            >
              <Chrome className="mr-2 size-4" aria-hidden="true" />
              {isGooglePending ? "Google açılır" : "Google ilə davam et"}
            </Button>
          </form>
        </div>
      ) : null}
    </AuthCard>
  );
}
