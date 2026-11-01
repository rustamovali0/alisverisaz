import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { ContactSupportPage } from "@/components/help/contact-page";
import { getSiteSettings } from "@/lib/cms/data";
import { getCurrentUserProfile } from "@/lib/auth/session";

type ContactPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const metadata: Metadata = {
  title: "Əlaqə və Dəstək",
  description:
    "Alışveriş.az texniki dəstək, şikayət və platforma ilə əlaqə səhifəsi.",
  alternates: {
    canonical: "/contact",
  },
};

export default async function ContactPage({ params }: ContactPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [settings, current] = await Promise.all([
    getSiteSettings(),
    getCurrentUserProfile(),
  ]);
  return (
    <ContactSupportPage
      locale={locale}
      phone={settings.phone || settings.whatsapp}
      email={settings.contactEmail}
      isAuthenticated={Boolean(current)}
      name={current?.profile?.full_name ?? current?.user.email ?? ""}
      userEmail={current?.user.email ?? ""}
      userPhone={current?.profile?.phone ?? ""}
    />
  );
}
