"use client";

import { ArrowLeft, ArrowRight, Chrome, ImagePlus, Store, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition, type UIEvent } from "react";
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
import { refreshCachedClientAuthProfile } from "@/lib/auth/use-client-auth-profile";
import { isRealImageFile } from "@/lib/images/client-file-validation";
import { cn } from "@/lib/utils";

type RegisterFormProps = {
  userRegistrationEnabled: boolean;
  storeRegistrationEnabled: boolean;
};

type FieldErrors = {
  firstName?: string;
  lastName?: string;
  storeName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
};

const MAX_SELLER_IMAGE_SIZE = 5 * 1024 * 1024;

function LegalReadDialog({
  onClose,
  onRead,
}: {
  onClose: () => void;
  onRead: () => void;
}) {
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const title = "İstifadəçi razılaşması və məxfilik siyasəti";

  function handleLegalScroll(event: UIEvent<HTMLDivElement>) {
    const area = event.currentTarget;
    if (area.scrollTop + area.clientHeight >= area.scrollHeight - 16) {
      setHasReachedEnd(true);
      onRead();
    }
  }

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/60 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-5">
          <div>
            <h2 className="font-bold text-slate-950">{title}</h2>
            <p className="text-xs text-slate-500">Razılıq üçün sənədi sona qədər oxuyun.</p>
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={onClose} aria-label="Pəncərəni bağla">
            <X className="size-5" aria-hidden="true" />
          </Button>
        </div>
        <div className="max-h-[360px] overflow-y-auto px-5 py-5 text-sm leading-7 text-slate-600" onScroll={handleLegalScroll}>
          <div className="space-y-5">
            <section><h3 className="font-bold text-slate-950">Hesab və məsuliyyət</h3><p>İstifadəçi düzgün məlumat təqdim etməli, hesab girişlərini qorumalı və platformadan qanuni məqsədlərlə istifadə etməlidir. Satıcı məhsul məlumatı, qiymət, stok və çatdırılma şərtlərinin düzgünlüyünə cavabdehdir.</p></section>
            <section><h3 className="font-bold text-slate-950">Platformadan istifadə</h3><p>Saxta elan, icazəsiz məlumat əldə etmə, zərərli kod, spam və digər istifadəçilərin hüquqlarını pozan fəaliyyət qadağandır. Qaydaların pozulması halında elan və hesab məhdudlaşdırıla bilər.</p></section>
            <section><h3 className="font-bold text-slate-950">Toplanan məlumatlar</h3><p>Qeydiyyat və sifariş zamanı ad, e-poçt, telefon, ünvan və hesabın işləməsi üçün lazım olan texniki məlumatlar toplanır. Mağaza hesabında mağaza adı, loqo, banner və əlaqə məlumatları saxlanıla bilər.</p></section>
            <section><h3 className="font-bold text-slate-950">Məlumatların istifadəsi və cookie-lər</h3><p>Məlumatlar hesabı yaratmaq, sifarişi icra etmək, təhlükəsizliyi qorumaq və dəstək göstərmək üçün istifadə olunur; icazəsiz satılmır. Sayt sessiya, səbət və təhlükəsizlik üçün zəruri cookie-lərdən istifadə edir.</p></section>
            <section><h3 className="font-bold text-slate-950">Saxlanma və təhlükəsizlik</h3><p>Məlumatlara giriş rol və icazələrlə məhdudlaşdırılır. Profil məlumatlarının yenilənməsi və ya silinməsi üçün dəstək mərkəzinə müraciət edilə bilər.</p></section>
            <p className="rounded-xl bg-orange-50 p-3 font-medium text-orange-800">Sənədlərin birləşdirilmiş mətnini sona qədər oxudunuz. Razılıq avtomatik seçiləcək.</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t bg-slate-50 px-4 py-3 sm:px-5">
          <span className={hasReachedEnd ? "text-sm font-semibold text-emerald-700" : "text-sm text-slate-500"}>
            {hasReachedEnd ? "Oxundu" : "Sonadək aşağı sürüşdürün"}
          </span>
          <Button type="button" onClick={onClose} disabled={!hasReachedEnd} className="bg-primary text-white hover:bg-orange-600">
            Tamam
          </Button>
        </div>
      </div>
    </div>
  );
}

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
    if (inputRef.current && typeof DataTransfer !== "undefined") {
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
            <span className="sm:hidden">Şəkil seç</span>
            <span className="hidden sm:inline">Şəkli seç və ya buraya sürüklə</span>
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/*,.heic,.heif,.avif,.tif,.tiff,.bmp"
        className="hidden"
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
  const customerOnly = searchParams.get("customerOnly") === "1";
  const [role, setRole] = useState(
    customerOnly
      ? "customer"
      : searchParams.get("role") === "seller" && storeRegistrationEnabled
      ? "seller"
      : userRegistrationEnabled
        ? "customer"
        : "seller",
  );
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [legalRead, setLegalRead] = useState(false);
  const [legalDialogOpen, setLegalDialogOpen] = useState(false);
  const [sellerStep, setSellerStep] = useState<1 | 2>(1);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const canRegister = customerOnly
    ? userRegistrationEnabled
    : userRegistrationEnabled || storeRegistrationEnabled;
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const next = searchParams.get("next") ?? "";
  const loginHref = next
    ? `/login?${new URLSearchParams({ next }).toString()}`
    : "/login";

  useEffect(() => {
    if (legalRead) {
      setTermsAccepted(true);
      setFieldErrors((current) => ({ ...current, terms: undefined }));
    }
  }, [legalRead]);

  function validate() {
    const nextErrors: FieldErrors = {};
    const isSellerRegistration = !customerOnly && role === "seller";

    if (isSellerRegistration) {
      if (!storeName.trim()) {
        nextErrors.storeName = "Mağaza adı daxil edin.";
      }
    } else if (!firstName.trim()) {
      nextErrors.firstName = "Ad daxil edin.";
    }

    if (!isSellerRegistration && !lastName.trim()) {
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

      const isSellerRegistration = !customerOnly && role === "seller";
      if (isSellerRegistration) {
        const avatarFile = formData.get("avatarFile");
        const bannerFile = formData.get("bannerFile");
        if (!(avatarFile instanceof File) || avatarFile.size === 0 || !(bannerFile instanceof File) || bannerFile.size === 0) {
          void appAlert.error("Loqo və banner şəkillərinin hər ikisini seçin.", "Mağaza şəkilləri tələb olunur");
          return;
        }
      }
      const resolvedFullName = isSellerRegistration
        ? storeName.trim()
        : `${firstName.trim()} ${lastName.trim()}`.trim();

      formData.set("firstName", isSellerRegistration ? "" : firstName.trim());
      formData.set("lastName", isSellerRegistration ? "" : lastName.trim());
      formData.set("storeName", isSellerRegistration ? storeName.trim() : "");
      formData.set("fullName", resolvedFullName);
      formData.set("email", email.trim());
      formData.set("phone", phone);
      formData.set("password", password);
      formData.set("confirmPassword", confirmPassword);
      formData.set("terms", termsAccepted ? "on" : "");
      formData.set("role", customerOnly ? "customer" : role);
      formData.set("next", next);

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

      void appAlert.success(
        role === "seller" ? "Hesabınız yoxlanılır" : "Qeydiyyat uğurludur",
        role === "seller" ? "Müraciətiniz qəbul edildi. Hesabınız qısa zamanda yoxlanılıb aktiv ediləcək." : result.message,
      );
      if (role === "customer") {
        await refreshCachedClientAuthProfile();
      }
      router.replace(result.redirectTo);
      router.refresh();
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
      className="mx-auto max-w-[680px] rounded-2xl border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] [&>div.mb-7]:mb-5"
      topStart={
        <Button asChild variant="ghost" size="sm" className="h-10 px-2 text-sm">
          <Link href="/">
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Ana səhifə
          </Link>
        </Button>
      }
      topEnd={
        <Button asChild variant="outline" size="sm" className="h-10 px-2 text-sm">
          <Link href={loginHref}>
            Hesabınız var?
            <ArrowRight className="ml-2 size-4" aria-hidden="true" />
          </Link>
        </Button>
      }
      title="Hesabınızı yaradın"
      description={canRegister ? "Alıcı və ya satıcı kimi bir neçə addımda başlayın." : "Qeydiyyat hazırda bağlıdır."}
      footer={
        <div className="space-y-3">
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
        <form action={handleSubmit} encType="multipart/form-data" className="grid gap-3 lg:grid-cols-2">
          <div className="lg:col-span-2"><AuthErrorAlert message={serverError} /></div>
          <div className={cn("contents", role === "seller" && sellerStep === 2 && "hidden")}>
          {!customerOnly ? (
            <fieldset className="grid gap-2 lg:col-span-2">
              <legend className="text-sm font-medium">Hesab tipi</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {userRegistrationEnabled ? (
                  <button
                    type="button"
                    onClick={() => {
                      setRole("customer");
                      setSellerStep(1);
                      setFieldErrors((current) => ({ ...current, storeName: undefined }));
                    }}
                    className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition ${
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
                    onClick={() => {
                      setRole("seller");
                      setSellerStep(1);
                      setFieldErrors((current) => ({
                        ...current,
                        firstName: undefined,
                        lastName: undefined,
                      }));
                    }}
                    className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition ${
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
          ) : null}
          {!customerOnly && role === "seller" ? (
            <AuthField
              id="storeName"
              name="storeName"
              label="Mağaza adı"
              autoComplete="organization"
              autoCapitalize="words"
              value={storeName}
              onChange={(event) => {
                setStoreName(event.target.value);
                setFieldErrors((current) => ({ ...current, storeName: undefined }));
              }}
              error={fieldErrors.storeName}
              className="lg:col-span-2"
              required
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
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
          )}
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
            hint={undefined}
            error={fieldErrors.password}
            minLength={8}
            required
          />
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
          <div className="space-y-2 lg:col-span-2">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Şifrə gücü</span>
              <span>{passwordStrength.label || "Seçilməyib"}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
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
          <div className="flex items-start gap-3 rounded-xl border border-border/80 bg-muted/30 p-3 text-sm lg:col-span-2">
            <input
              type="checkbox"
              checked={termsAccepted}
              readOnly
              onClick={() => setLegalDialogOpen(true)}
              className="mt-1 size-4 cursor-pointer rounded border-input"
              aria-label="Razılaşma mətnini aç"
            />
            <span className="leading-6">
              <Link href="/terms" className="font-medium text-foreground underline underline-offset-4">
                İstifadəçi razılaşması
              </Link>{" "}
              və{" "}
              <Link href="/privacy" className="font-medium text-foreground underline underline-offset-4">
                məxfilik siyasəti
              </Link>{" "}
              sona qədər oxunduqdan sonra avtomatik qəbul edilir.
            </span>
          </div>
          {fieldErrors.terms ? (
            <p className="text-xs font-medium text-destructive lg:col-span-2">{fieldErrors.terms}</p>
          ) : null}
          </div>
          {!customerOnly && role === "seller" && sellerStep === 2 ? (
            <div className="grid gap-4 rounded-2xl border border-orange-100 bg-orange-50/50 p-4 lg:col-span-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-600">Addım 2 / 2</p>
                <h3 className="mt-1 text-lg font-bold text-slate-950">Mağazanızın görünüşü</h3>
                <p className="mt-1 text-sm text-slate-500">Loqo və banner şəkillərini əlavə edin.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                <SellerImageDropzone name="avatarFile" label="Profil şəkli / Loqo" ratioClassName="aspect-square" />
                <SellerImageDropzone name="bannerFile" label="Banner şəkli" ratioClassName="aspect-[16/7]" />
              </div>
            </div>
          ) : null}
          {role === "seller" && sellerStep === 1 ? (
            <Button
              type="button"
              onClick={() => {
                if (validate()) setSellerStep(2);
              }}
              className="h-11 w-full rounded-[10px] bg-primary font-semibold text-white shadow-none hover:bg-orange-600 lg:col-span-2"
            >
              Növbəti <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </Button>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:col-span-2">
              {role === "seller" ? (
                <Button type="button" variant="outline" onClick={() => setSellerStep(1)} className="h-11 rounded-[10px]">Geri</Button>
              ) : null}
              <Button type="submit" disabled={isPending} className={cn("h-11 w-full rounded-[10px] bg-primary font-semibold text-white shadow-none hover:bg-orange-600", role !== "seller" && "sm:col-span-2")}>
                {isPending ? "Yaradılır" : "Hesab yarat"}
              </Button>
            </div>
          )}
        </form>
      ) : null}

      <div className="hidden" aria-hidden="true">
        <AuthDivider />
        {canRegister ? (
          <form action={handleGoogleSubmit} className="grid gap-3">
            <input name="next" type="hidden" value={next} />
            <input name="mode" type="hidden" value="public" />
            <Button
              type="submit"
              variant="outline"
              className="h-11 w-full rounded-xl"
              disabled={isGooglePending}
            >
              <Chrome className="mr-2 size-4" aria-hidden="true" />
              {isGooglePending ? "Google açılır" : "Google ilə davam et"}
            </Button>
          </form>
        ) : null}
      </div>
      {legalDialogOpen ? (
        <LegalReadDialog
          onClose={() => setLegalDialogOpen(false)}
          onRead={() => {
            setLegalRead(true);
          }}
        />
      ) : null}
    </AuthCard>
  );
}
