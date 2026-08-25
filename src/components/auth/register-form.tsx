"use client";

import { ArrowLeft, ArrowRight, Chrome, ImagePlus, Store, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthDivider } from "@/components/auth/auth-divider";
import { AuthErrorAlert } from "@/components/auth/auth-error-alert";
import { AuthField } from "@/components/auth/auth-field";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { Link, useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import { googleOAuthAction, registerAction } from "@/lib/auth/actions";
import { isRealImageFile } from "@/lib/images/client-file-validation";

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

const MAX_SELLER_IMAGE_SIZE = 5 * 1024 * 1024;

function SellerImageDropzone({
  name,
  label,
  ratioClassName,
}: {
  name: string;
  label: string;
  ratioClassName: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];

    if (!file) {
      return;
    }

    if (file.size > MAX_SELLER_IMAGE_SIZE) {
      setError(`${label} maksimum 5MB ola bilər.`);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      setPreview("");
      return;
    }

    if (!(await isRealImageFile(file))) {
      setError("Yalnız real şəkil faylları qəbul edilir.");
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      setPreview("");
      return;
    }

    setError("");
    if (inputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      inputRef.current.files = dataTransfer.files;
    }

    const nextPreview = URL.createObjectURL(file);
    setPreview((current) => {
      if (current.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }

      return nextPreview;
    });
  }

  return (
    <div className="grid min-w-0 gap-2">
      <span className="text-sm font-medium">{label}</span>
      <button
        type="button"
        className={`relative grid w-full min-w-0 place-items-center overflow-hidden rounded-xl border border-dashed bg-background p-3 text-center transition ${ratioClassName} ${
          isDragging ? "border-primary bg-primary/5" : "border-input"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void handleFiles(event.dataTransfer.files);
        }}
      >
        {preview ? (
          <img src={preview} alt={label} className="h-full w-full rounded-lg object-cover" />
        ) : (
          <span className="grid place-items-center gap-2 text-sm text-muted-foreground">
            <ImagePlus className="size-7" aria-hidden="true" />
            Şəkli buraya sürüklə və ya seç
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/*,.heic,.heif,.avif,.tif,.tiff,.bmp"
        className="sr-only"
        onChange={(event) => void handleFiles(event.target.files)}
      />
      {error ? <span className="text-xs font-medium text-destructive">{error}</span> : null}
    </div>
  );
}

function getPasswordStrength(value: string) {
  if (!value) {
    return { label: "", className: "bg-muted" };
  }

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
  const [isGooglePending, startGoogleTransition] = useTransition();
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
  const next = searchParams.get("next") ?? "";

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
    if (isPending) {
      return;
    }

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

      let result;

      try {
        result = await registerAction(formData);
      } catch {
        const message = "Qeydiyyat tamamlanmadı. Şəkilləri yoxlayıb yenidən cəhd edin.";
        setServerError(message);
        void appAlert.error(message, "Qeydiyyat alınmadı");
        return;
      }

      if (!result.ok) {
        setServerError(result.message);
        void appAlert.error(result.message, "Qeydiyyat alınmadı");
        return;
      }

      void appAlert.success("Qeydiyyat uğurludur", result.message);
      router.replace(result.redirectTo);
    });
  }

  function handleGoogleSubmit(formData: FormData) {
    if (isGooglePending) {
      return;
    }

    formData.set("next", next);
    formData.set("mode", "public");
    setServerError(null);

    startGoogleTransition(async () => {
      const result = await googleOAuthAction(formData);

      if (!result.ok) {
        setServerError(result.message);
        void appAlert.error(result.message, "Google qeydiyyatı alınmadı");
        return;
      }

      window.location.assign(result.redirectTo);
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
        <form action={handleSubmit} encType="multipart/form-data" className="grid gap-4">
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
              setEmail(event.target.value.toLowerCase());
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
              <span>{passwordStrength.label || "Seçilməyib"}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all duration-200 ${passwordStrength.className}`}
                style={{
                  width:
                    !password
                      ? "0%"
                      : passwordStrength.label === "Zəif"
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
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Hesab tipi</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {userRegistrationEnabled ? (
                <button
                  type="button"
                  onClick={() => setRole("customer")}
                  className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition ${
                    role === "customer"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background text-foreground hover:border-primary/50"
                  }`}
                  aria-pressed={role === "customer"}
                >
                  <UserRound className="size-4" aria-hidden="true" />
                  İstifadəçi / Müştəri
                </button>
              ) : null}
              {storeRegistrationEnabled ? (
                <button
                  type="button"
                  onClick={() => setRole("seller")}
                  className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition ${
                    role === "seller"
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background text-foreground hover:border-primary/50"
                  }`}
                  aria-pressed={role === "seller"}
                >
                  <Store className="size-4" aria-hidden="true" />
                  Mağaza sahibi
                </button>
              ) : null}
            </div>
          </fieldset>
          {role === "seller" ? (
            <div className="grid gap-4 rounded-xl border bg-muted/20 p-4">
              <div>
                <h3 className="text-sm font-semibold">Mağaza şəkilləri</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Logo və banneri URL ilə yox, şəkil faylı kimi əlavə edin.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                <SellerImageDropzone
                  name="avatarFile"
                  label="Profil şəkli / Logo"
                  ratioClassName="aspect-square"
                />
                <SellerImageDropzone
                  name="bannerFile"
                  label="Banner şəkli"
                  ratioClassName="aspect-[16/7]"
                />
              </div>
            </div>
          ) : null}
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
      {canRegister ? (
        <form action={handleGoogleSubmit} className="grid gap-3">
          <input name="next" type="hidden" value={next} />
          <input name="mode" type="hidden" value="public" />
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
      ) : null}
    </AuthCard>
  );
}
