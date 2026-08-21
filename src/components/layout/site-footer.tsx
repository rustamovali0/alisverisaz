"use client";

import { useEffect, useState } from "react";
import { Instagram } from "lucide-react";
import { useTranslations } from "next-intl";

import { TikTokIcon, WhatsAppIcon } from "@/components/icons/social-icons";
import { Link } from "@/i18n/navigation";
import type { AuthRole } from "@/lib/auth/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SiteFooterProps = {
  siteName?: string;
  description?: string;
  socialLinks?: {
    instagram?: string;
    tiktok?: string;
    whatsapp?: string;
  };
};

function normalizeSocialHref(kind: "instagram" | "tiktok" | "whatsapp", value = "") {
  if (!value) {
    return "";
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  if (kind === "whatsapp") {
    const digits = value.replace(/\D/g, "");

    return digits ? `https://wa.me/${digits}` : "";
  }

  const cleanValue = value.replace(/^@/, "");

  return kind === "instagram"
    ? `https://instagram.com/${cleanValue}`
    : `https://tiktok.com/@${cleanValue}`;
}

function getAccountHref(role: AuthRole | null) {
  if (role === "seller") {
    return "/store/dashboard";
  }

  return "/dashboard";
}

function formatBrandName(value?: string) {
  if (!value || value.toLocaleLowerCase("az-AZ").includes("alisveris")) {
    return "Alışveriş";
  }

  return value;
}

export function SiteFooter({
  siteName = "Alışveriş",
  socialLinks,
}: SiteFooterProps) {
  const common = useTranslations("common");
  const nav = useTranslations("nav");
  const footer = useTranslations("footer");
  const auth = useTranslations("auth");
  const displaySiteName = formatBrandName(siteName);
  const [role, setRole] = useState<AuthRole | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const socials = [
    {
      key: "instagram" as const,
      label: "Instagram",
      href: normalizeSocialHref("instagram", socialLinks?.instagram),
      icon: Instagram,
    },
    {
      key: "tiktok" as const,
      label: "TikTok",
      href: normalizeSocialHref("tiktok", socialLinks?.tiktok),
      icon: TikTokIcon,
    },
    {
      key: "whatsapp" as const,
      label: "WhatsApp",
      href: normalizeSocialHref("whatsapp", socialLinks?.whatsapp),
      icon: WhatsAppIcon,
    },
  ].filter((item) => item.href);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (isMounted) {
          setRole(null);
          setIsChecked(true);
        }
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .returns<Array<{ role: AuthRole }>>()
        .maybeSingle();

      if (isMounted) {
        setRole(profile?.role === "seller" ? "seller" : "customer");
        setIsChecked(true);
      }
    }

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <footer className="w-full max-w-full overflow-x-clip border-t bg-card/95">
      <div className="container grid max-w-full grid-cols-2 gap-x-5 gap-y-4 py-4 md:grid-cols-2 md:gap-6 md:py-10 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
        <div className="col-span-2 min-w-0 md:col-span-1">
          <Link href="/" className="inline-flex min-w-0 items-center gap-2">
            <span className="grid size-8 place-items-center rounded-md bg-primary text-sm font-black text-primary-foreground md:size-11 md:rounded-lg md:text-lg">
              a
            </span>
            <span className="min-w-0 truncate text-lg font-black tracking-normal md:text-xl">
              {displaySiteName}
            </span>
          </Link>
          {socials.length > 0 ? (
            <div className="mt-3 flex items-center gap-2 md:mt-5 md:gap-3">
              {socials.map((item) => {
                const Icon = item.icon;

                return (
                  <a
                    key={item.key}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex size-9 items-center justify-center rounded-md border bg-background text-muted-foreground transition hover:border-primary hover:bg-primary hover:text-primary-foreground md:size-12 md:rounded-lg"
                    aria-label={item.label}
                  >
                    <Icon className="size-5 md:size-6" aria-hidden="true" />
                  </a>
                );
              })}
            </div>
          ) : null}
        </div>
        <div className="min-w-0">
          <h2 className="text-xs font-black uppercase tracking-normal text-foreground md:text-sm">
            {footer("platform")}
          </h2>
          <div className="mt-2 grid gap-1.5 text-xs text-muted-foreground md:mt-4 md:gap-3 md:text-sm">
            <Link href="/products" className="hover:text-primary">
              {nav("stores")}
            </Link>
            <Link href="/products" className="hover:text-primary">
              {nav("products")}
            </Link>
            <Link href="/register" className="hover:text-primary">
              {footer("openStore")}
            </Link>
          </div>
        </div>
        <div className="min-w-0">
          <h2 className="text-xs font-black uppercase tracking-normal text-foreground md:text-sm">
            {footer("account")}
          </h2>
          <div className="mt-2 grid gap-1.5 text-xs text-muted-foreground md:mt-4 md:gap-3 md:text-sm">
            {isChecked && role ? (
              <Link href={getAccountHref(role)} className="hover:text-primary">
                {role === "seller" ? footer("goToPanel") : nav("account")}
              </Link>
            ) : isChecked ? (
              <>
                <Link href="/login" className="hover:text-primary">
                  {auth("login")}
                </Link>
                <Link href="/register" className="hover:text-primary">
                  {auth("register")}
                </Link>
              </>
            ) : null}
            <Link href="/cart" className="hover:text-primary">
              {common("cart")}
            </Link>
          </div>
        </div>
        <div className="col-span-2 min-w-0 md:col-span-1">
          <h2 className="text-xs font-black uppercase tracking-normal text-foreground md:text-sm">
            {footer("support")}
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground md:mt-4 md:grid-cols-1 md:gap-3 md:text-sm">
            <Link href="/help" className="hover:text-primary">
              {footer("helpCenter")}
            </Link>
            <Link href="/faq" className="hover:text-primary">
              FAQ
            </Link>
            <Link href="/contact" className="hover:text-primary">
              {footer("contactSupport")}
            </Link>
            <Link href="/terms" className="hover:text-primary">
              {footer("terms")}
            </Link>
            <Link href="/privacy" className="hover:text-primary">
              {footer("privacy")}
            </Link>
            <Link href="/rules" className="hover:text-primary">
              {footer("rules")}
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t">
        <div className="container flex max-w-full flex-col gap-2 py-2 pb-[calc(4.6rem+env(safe-area-inset-bottom))] text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:py-4 md:pb-4 md:text-sm">
          <span>© {new Date().getFullYear()} {displaySiteName}</span>
        </div>
      </div>
    </footer>
  );
}
