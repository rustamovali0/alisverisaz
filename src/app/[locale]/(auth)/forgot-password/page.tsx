import { Suspense } from "react";

import { AuthSplitScreen } from "@/components/auth/auth-split-screen";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  return (
    <AuthSplitScreen variant="login">
      <Suspense fallback={null}>
        <ForgotPasswordForm turnstileSiteKey={turnstileSiteKey} />
      </Suspense>
    </AuthSplitScreen>
  );
}
