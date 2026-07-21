"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthField, AuthSelect } from "@/components/auth/auth-field";
import { Button } from "@/components/ui/button";
import { appAlert } from "@/lib/alerts/swal";
import { registerAction } from "@/lib/auth/actions";

export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await registerAction(formData);

      if (!result.ok) {
        await appAlert.error(result.message, "Qeydiyyat alinmadi");
        return;
      }

      await appAlert.success("Qeydiyyat ugurludur", result.message);
      router.replace(result.redirectTo);
      router.refresh();
    });
  }

  return (
    <AuthCard
      title="Qeydiyyat"
      description="Ferd istifadeci ve ya magaza sahibi kimi hesab yaradiriq."
      footer={
        <>
          Artıq hesabiniz var?{" "}
          <Link className="font-medium text-primary hover:underline" href="/login">
            Giris
          </Link>
        </>
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
          label="Sifre"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <AuthSelect id="role" name="role" label="Hesab tipi" defaultValue="customer">
          <option value="customer">Ferdi istifadeci</option>
          <option value="seller">Magaza sahibi</option>
        </AuthSelect>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Yaradilir" : "Hesab yarat"}
        </Button>
      </form>
    </AuthCard>
  );
}
