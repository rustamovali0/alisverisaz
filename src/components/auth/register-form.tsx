"use client";

import { useTransition } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthField, AuthSelect } from "@/components/auth/auth-field";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { appAlert } from "@/lib/alerts/swal";
import { registerAction } from "@/lib/auth/actions";

export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await registerAction(formData);

      if (!result.ok) {
        await appAlert.error(result.message, "Qeydiyyat alınmadı");
        return;
      }

      await appAlert.success("Qeydiyyat uğurludur", result.message);
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
        <AuthField
          id="password"
          name="password"
          label="Şifrə"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <AuthSelect id="role" name="role" label="Hesab tipi" defaultValue="customer">
          <option value="customer">İstifadəçi / Müştəri</option>
          <option value="seller">Mağaza sahibi</option>
        </AuthSelect>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Yaradılır" : "Hesab yarat"}
        </Button>
      </form>
    </AuthCard>
  );
}
