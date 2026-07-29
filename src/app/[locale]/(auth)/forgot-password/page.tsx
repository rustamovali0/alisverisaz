import { Suspense } from "react";

import { AuthSplitScreen } from "@/components/auth/auth-split-screen";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthSplitScreen variant="login">
      <Suspense fallback={null}>
        <ForgotPasswordForm />
      </Suspense>
    </AuthSplitScreen>
  );
}
