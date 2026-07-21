import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { LoadingState } from "@/components/common/loading-state";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState label="Giris formu yuklenir" />}>
      <LoginForm />
    </Suspense>
  );
}
