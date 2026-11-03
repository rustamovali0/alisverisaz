"use client";
import { useId } from "react";
import { PasswordInput } from "@/components/auth/password-input";
import { TurnstileField } from "@/components/auth/turnstile-field";
export function DangerPasswordFields({ password, onPassword, token, onToken, siteKey }: { password: string; onPassword: (value: string) => void; token: string; onToken: (value: string) => void; siteKey: string }) {
  const id = useId();
  return <div className="max-w-md space-y-4">
    <PasswordInput id={id} name="adminPassword" label="RAdmin giriş şifrəsi" value={password} onValueChange={onPassword} required autoComplete="current-password" hint="Dəyişikliyi təsdiqləmək üçün mövcud admin giriş şifrənizi yazın." inputClassName="h-12 text-base focus-visible:border-emerald-600 focus-visible:ring-emerald-100" toggleClassName="size-11 right-0.5" />
    <TurnstileField action="login" siteKey={siteKey} token={token} onTokenChange={onToken} />
  </div>;
}
