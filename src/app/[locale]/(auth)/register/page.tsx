import { RegisterForm } from "@/components/auth/register-form";
import { AuthSplitScreen } from "@/components/auth/auth-split-screen";
import { getSiteSettings } from "@/lib/cms/data";

export default async function RegisterPage() {
  const settings = await getSiteSettings();

  return (
    <AuthSplitScreen variant="register">
      <RegisterForm
        userRegistrationEnabled={settings.userRegistrationEnabled}
        storeRegistrationEnabled={settings.storeRegistrationEnabled}
      />
    </AuthSplitScreen>
  );
}
