import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { AuthSplitScreen } from "@/components/auth/auth-split-screen";

export default function LoginPage() {
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  return (
    <AuthSplitScreen variant="login">
      <Suspense fallback={null}>
        <LoginForm turnstileSiteKey={turnstileSiteKey} />
      </Suspense>
    </AuthSplitScreen>
  );
}
