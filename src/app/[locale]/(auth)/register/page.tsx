import { RegisterForm } from "@/components/auth/register-form";
import { getSiteSettings } from "@/lib/cms/data";

export default async function RegisterPage() {
  const settings = await getSiteSettings();

  return (
    <RegisterForm
      userRegistrationEnabled={settings.userRegistrationEnabled}
      storeRegistrationEnabled={settings.storeRegistrationEnabled}
    />
  );
}
