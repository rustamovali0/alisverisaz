import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getLoginPath } from "@/lib/auth/redirects";
import { getEmailPreferences } from "@/lib/email/preferences";
import { EmailPreferences } from "@/components/notifications/email-preferences";

export const dynamic = "force-dynamic";

export default async function EmailPreferencesPage() {
  const current = await getCurrentUserProfile("public");
  if (!current) {
    const admin = await getCurrentUserProfile("admin");
    if (admin?.role === "admin") redirect("/radmin/email");
    redirect(getLoginPath("/email-preferences"));
  }
  if (current.role === "admin") redirect("/radmin/email");

  return (
    <main className="mx-auto w-full max-w-2xl space-y-5 px-4 py-7 pb-24">
      <div>
        <Link
          href={current.role === "seller" ? "/store/dashboard" : "/dashboard"}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-emerald-700"
        >
          ← Hesabıma qayıt
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Bildiriş seçimləriniz</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Almaq istədiyiniz e-poçtları seçin və dəyişiklikləri saxlayın.
        </p>
      </div>
      <EmailPreferences initial={await getEmailPreferences()} />
    </main>
  );
}
