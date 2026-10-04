import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AuthSplitScreen } from "@/components/auth/auth-split-screen";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    mode?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const search = await searchParams;

  if (search?.mode !== "recovery") {
    redirect("/forgot-password");
  }

  return (
    <AuthSplitScreen variant="login">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthSplitScreen>
  );
}
