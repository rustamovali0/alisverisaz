"use client";

import { ArrowLeft, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthErrorAlert } from "@/components/auth/auth-error-alert";
import { AuthField, AuthSelect } from "@/components/auth/auth-field";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { Link, useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import { registerAction } from "@/lib/auth/actions";

type RegisterFormProps = {
  userRegistrationEnabled: boolean;
  storeRegistrationEnabled: boolean;
};

type FieldErrors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
};

function getPasswordStrength(value: string) {
  const rules = [
    value.length >= 8,
    /[A-ZƏÜÖĞÇŞİ]/.test(value),
    /[a-zəüöğçşı]/.test(value),
    /\d/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ];
  const score = rules.filter(Boolean).length;

  if (score <= 1) {
    return { label: "Zəif", className: "bg-destructive" };
  }

  if (score <= 3) {
    return { label: "Orta", className: "bg-amber-500" };
  }

  return { label: "Güclü", className: "bg-emerald-500" };
}

export function RegisterForm({
  userRegistrationEnabled,
  storeRegistrationEnabled,
}: RegisterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [role, setRole] = useState(
    searchParams.get("role") === "seller" && storeRegistrationEnabled
      ? "seller"
      : userRegistrationEnabled
        ? "customer"
        : "seller",
  );
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const canRegister = userRegistrationEnabled || storeRegistrationEnabled;
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  function validate() {
    const nextErrors: FieldErrors = {};

    if (!firstName.trim()) {
      nextErrors.firstName = "Ad daxil edin.";
    }

    if (!lastName.trim()) {
      nextErrors.lastName = "Soyad daxil edin.";
    }

    if (!email.trim()) {
      nextErrors.email = "Email daxil edin.";
    }

    if (!phone.trim()) {
      nextErrors.phone = "Telefon nömrəsi daxil edin.";
    }

    if (!password.trim()) {
      nextErrors.password = "Şifrə daxil edin.";
    }

    if (!confirmPassword.trim()) {
      nextErrors.confirmPassword = "Şifrəni təkrarlayın.";
    }

    if (password && confirmPassword && password !== confirmPassword) {
      nextErrors.confirmPassword = "Şifrələr uyğun gəlmir.";
    }

    if (!termsAccepted) {
      nextErrors.terms = "İstifadəçi razılaşmasını təsdiqləyin.";
    }

    setFieldErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      if (!validate()) {
        return;
      }

      formData.set("firstName", firstName.trim());
      formData.set("lastName", lastName.trim());
      formData.set("fullName", `${firstName.trim()} ${lastName.trim()}`.trim());
      formData.set("email", email.trim());
      formData.set("phone", phone);
      formData.set("password", password);
      formData.set("confirmPassword", confirmPassword);
      formData.set("terms", termsAccepted ? "on" : "");
      formData.set("role", role);

      const result = await registerAction(formData);

      if (!result.ok) {
        setServerError(result.message);
        void appAlert.error(result.message, "Qeydiyyat alınmadı");
        return;
      }

      void appAlert.success("Qeydiyyat uğurludur", result.message);
      router.replace(result.redirectTo);
      router.refresh();
    });
  }

  return (
    <AuthCard
      className="mx-auto max-w-[560px]"
      topStart={
        <Button asChild variant="ghost" size="sm" className="h-10 px-2 text-sm">
          <Link href="/">
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Geri
          </Link>
        </Button>
      }
      topEnd={
        <Button asChild variant="outline" size="sm" className="h-10 px-2 text-sm">
          <Link href="/login">
            Hesabınız var?
            <ArrowRight className="ml-2 size-4" aria-hidden="true" />
          </Link>
        </Button>
      }
      title="Qeydiyyat"
      description={
        canRegister
          ? "Müştəri hesabı sifarişlər üçün, satıcı hesabı mağaza paneli üçün yaradılır."
          : "Qeydiyyat hazırda bağlıdır."
      }
      footer={
        <div className="space-y-3">
          <p>
            Artıq hesabınız var?{" "}
            <Link className="font-medium text-primary hover:underline" href="/login">
              Giriş
            </Link>
          </p>
          <Link className="font-medium text-primary hover:underline" href="/">
            Ana səhifəyə qayıt
          </Link>
        </div>
      }
    >
      {!canRegister ? (
        <div className="rounded-xl border bg-muted/70 p-4 text-sm text-muted-foreground">
          Yeni hesab yaratmaq admin tərəfindən müvəqqəti dayandırılıb.
        </div>
      ) : null}
      {canRegister ? (
        <form action={handleSubmit} className="grid gap-4">
          <AuthErrorAlert message={serverError} />
          <div className="grid gap-4 sm:grid-cols-2">
            <AuthField
              id="firstName"
              name="firstName"
              label="Ad"
              autoComplete="given-name"
              value={firstName}
              onChange={(event) => {
                setFirstName(event.target.value);
                setFieldErrors((current) => ({ ...current, firstName: undefined }));
              }}
              error={fieldErrors.firstName}
              required
            />
            <AuthField
              id="lastName"
              name="lastName"
              label="Soyad"
              autoComplete="family-name"
              value={lastName}
              onChange={(event) => {
                setLastName(event.target.value);
                setFieldErrors((current) => ({ ...current, lastName: undefined }));
              }}
              error={fieldErrors.lastName}
              required
            />
          </div>
          <AuthField
            id="email"
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setFieldErrors((current) => ({ ...current, email: undefined }));
            }}
            error={fieldErrors.email}
            required
          />
          <label className="grid gap-2 text-sm font-medium">
            <span>Telefon</span>
            <PhoneInput name="phone" value={phone} onValueChange={setPhone} required />
            {fieldErrors.phone ? (
              <span className="text-xs font-medium text-destructive">{fieldErrors.phone}</span>
            ) : null}
          </label>
          <PasswordInput
            id="password"
            name="password"
            label="Şifrə"
            autoComplete="new-password"
            value={password}
            onValueChange={(value) => {
              setPassword(value);
              setFieldErrors((current) => ({ ...current, password: undefined }));
            }}
            hint="Minimum 8 simvol, böyük hərf, kiçik hərf, rəqəm və simvol tövsiyə olunur."
            error={fieldErrors.password}
            minLength={8}
            required
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Şifrə gücü</span>
              <span>{passwordStrength.label}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-200 ${passwordStrength.className}`}
                style={{
                  width:
                    passwordStrength.label === "Zəif"
                      ? "25%"
                      : passwordStrength.label === "Orta"
                        ? "60%"
                        : "100%",
                }}
              />
            </div>
          </div>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            label="Şifrənin təkrarı"
            autoComplete="new-password"
            value={confirmPassword}
            onValueChange={(value) => {
              setConfirmPassword(value);
              setFieldErrors((current) => ({ ...current, confirmPassword: undefined }));
            }}
            error={fieldErrors.confirmPassword}
            minLength={8}
            required
          />
          <AuthSelect
            id="role"
            name="role"
            label="Hesab tipi"
            value={role}
            onChange={(event) => setRole(event.target.value === "seller" ? "seller" : "customer")}
          >
            {userRegistrationEnabled ? (
              <option value="customer">İstifadəçi / Müştəri</option>
            ) : null}
            {storeRegistrationEnabled ? (
              <option value="seller">Mağaza sahibi</option>
            ) : null}
          </AuthSelect>
          <AuthField
            id="avatarUrl"
            name="avatarUrl"
            label="Profil şəkli URL"
            type="url"
            placeholder="https://"
          />
          <AuthField
            id="bannerUrl"
            name="bannerUrl"
            label="Banner şəkli URL"
            type="url"
            placeholder="https://"
          />
          <label className="flex items-start gap-3 rounded-xl border border-border/80 bg-muted/30 p-4 text-sm">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => {
                setTermsAccepted(event.target.checked);
                setFieldErrors((current) => ({ ...current, terms: undefined }));
              }}
              className="mt-1 size-4 rounded border-input"
            />
            <span className="leading-6">
              <Link href="/terms" className="font-medium text-foreground underline-offset-4 hover:underline">
                İstifadəçi razılaşması
              </Link>{" "}
              və{" "}
              <Link href="/privacy" className="font-medium text-foreground underline-offset-4 hover:underline">
                məxfilik siyasəti
              </Link>{" "}
              ilə tanış oldum və qəbul edirəm.
            </span>
          </label>
          {fieldErrors.terms ? (
            <p className="text-xs font-medium text-destructive">{fieldErrors.terms}</p>
          ) : null}
          <Button type="submit" disabled={isPending} className="h-12 w-full rounded-xl">
            {isPending ? "Yaradılır" : "Hesab yarat"}
          </Button>
        </form>
      ) : null}

      <AuthDivider />

      <div className="rounded-xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
          Təhlükəsiz qeydiyyat
        </div>
        <p className="mt-2 leading-6">
          Duplicate email və telefon nömrələri aydın xəta mesajı ilə göstərilir, satıcı
          müraciətləri isə admin təsdiqi ilə aktivləşir.
        </p>
        <div className="mt-4 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <Sparkles className="size-3.5" aria-hidden="true" />
          Verification axını qorunur
        </div>
      </div>
    </AuthCard>
  );
}
