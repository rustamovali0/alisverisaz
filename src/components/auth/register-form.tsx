"use client";

import { useTransition } from "react";
import { useSearchParams } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthField, AuthSelect } from "@/components/auth/auth-field";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { Link, useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/app-alert";
import { registerAction } from "@/lib/auth/actions";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const defaultRole = searchParams.get("role") === "seller" ? "seller" : "customer";

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await registerAction(formData);

      if (!result.ok) {
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
      title="Qeydiyyat"
      description="Müştəri hesabı sifariş üçün, mağaza hesabı satış paneli üçün yaradılır."
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
      <form action={handleSubmit} className="grid gap-4">
        <AuthField
          id="fullName"
          name="fullName"
          label="Ad soyad"
          autoComplete="name"
          required
        />
        <AuthField
          id="email"
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
        />
        <label className="grid gap-2 text-sm font-medium">
          Telefon
          <PhoneInput name="phone" required />
        </label>
        <AuthField
          id="password"
          name="password"
          label="Şifrə"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <AuthSelect id="role" name="role" label="Hesab tipi" defaultValue={defaultRole}>
          <option value="customer">İstifadəçi / Müştəri</option>
          <option value="seller">Mağaza sahibi</option>
        </AuthSelect>
        <AuthField
          id="avatarUrl"
          name="avatarUrl"
          label="Profil şəkli URL"
          type="url"
          placeholder="https://..."
        />
        <AuthField
          id="bannerUrl"
          name="bannerUrl"
          label="Banner şəkli URL"
          type="url"
          placeholder="https://..."
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? "Yaradılır" : "Hesab yarat"}
        </Button>
      </form>
    </AuthCard>
  );
}
