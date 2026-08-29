import { Suspense } from "react";

import { AuthSplitScreen } from "@/components/auth/auth-split-screen";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

type ForgotPasswordPageProps = {
  searchParams?: Promise<{
    reset?: string;
  }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const search = await searchParams;
  const initialError =
    search?.reset === "expired"
      ? "Linkin vaxtı bitib və ya artıq istifadə olunub. Zəhmət olmasa yenidən bərpa linki göndərin."
      : null;

  return (
    <AuthSplitScreen variant="login">
      <Suspense fallback={null}>
        <ForgotPasswordForm initialError={initialError} />
      </Suspense>
    </AuthSplitScreen>
  );
}
