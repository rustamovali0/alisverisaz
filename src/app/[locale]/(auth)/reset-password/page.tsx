import { Suspense } from "react";

import { AuthSplitScreen } from "@/components/auth/auth-split-screen";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <AuthSplitScreen variant="login">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthSplitScreen>
  );
}
