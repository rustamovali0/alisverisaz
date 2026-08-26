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
  logoUrl?: string;
  darkLogoUrl?: string;
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
  logoUrl,
  darkLogoUrl,
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
    <footer className="w-full max-w-full overflow-x-clip bg-[#e9f6f2] px-3 py-3 text-slate-900 sm:px-4 md:py-5">
      <div className="mx-auto max-w-[1220px] overflow-hidden rounded-lg border border-cyan-100 bg-[#f5fbf9]">
      <div className="grid grid-cols-2 gap-x-5 gap-y-5 px-4 py-5 sm:px-6 md:grid-cols-2 md:gap-8 md:px-8 md:py-12 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
        <div className="col-span-2 min-w-0 md:col-span-1">
          <Link href="/" className="inline-flex min-w-0 items-center gap-2">
            {logoUrl ? (
              <span className="grid size-8 place-items-center overflow-hidden rounded-md border border-cyan-100 bg-white shadow-sm md:size-11 md:rounded-lg">
                <img
                  src={logoUrl}
                  alt={displaySiteName}
                  className={darkLogoUrl ? "h-full w-full object-contain p-1.5 dark:hidden" : "h-full w-full object-contain p-1.5"}
                />
                {darkLogoUrl ? (
                  <img
                    src={darkLogoUrl}
                    alt={displaySiteName}
                    className="hidden h-full w-full object-contain p-1.5 dark:block"
                  />
                ) : null}
              </span>
            ) : (
              <span className="grid size-8 place-items-center rounded-md bg-slate-950 text-sm font-black text-white shadow-sm md:size-11 md:rounded-lg md:text-lg">
                a
              </span>
            )}
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
                    className="inline-flex size-9 items-center justify-center rounded-md border border-cyan-100 bg-white text-slate-500 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 md:size-12 md:rounded-lg"
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
          <h2 className="text-xs font-black uppercase tracking-normal text-slate-900 md:text-sm">
            {footer("platform")}
          </h2>
          <div className="mt-2 grid gap-1.5 text-xs text-slate-500 md:mt-4 md:gap-3 md:text-sm">
            <Link href="/products" className="transition hover:text-cyan-700">
              {nav("stores")}
            </Link>
            <Link href="/products" className="transition hover:text-cyan-700">
              {nav("products")}
            </Link>
            <Link href="/register" className="transition hover:text-cyan-700">
              {footer("openStore")}
            </Link>
          </div>
        </div>
        <div className="min-w-0">
          <h2 className="text-xs font-black uppercase tracking-normal text-slate-900 md:text-sm">
            {footer("account")}
          </h2>
          <div className="mt-2 grid gap-1.5 text-xs text-slate-500 md:mt-4 md:gap-3 md:text-sm">
            {isChecked && role ? (
              <Link href={getAccountHref(role)} className="transition hover:text-cyan-700">
                {role === "seller" ? footer("goToPanel") : nav("account")}
              </Link>
            ) : isChecked ? (
              <>
                <Link href="/login" className="transition hover:text-cyan-700">
                  {auth("login")}
                </Link>
                <Link href="/register" className="transition hover:text-cyan-700">
                  {auth("register")}
                </Link>
              </>
            ) : null}
            <Link href="/cart" className="transition hover:text-cyan-700">
              {common("cart")}
            </Link>
          </div>
        </div>
        <div className="col-span-2 min-w-0 md:col-span-1">
          <h2 className="text-xs font-black uppercase tracking-normal text-slate-900 md:text-sm">
            {footer("support")}
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-500 md:mt-4 md:grid-cols-1 md:gap-3 md:text-sm">
            <Link href="/help" className="transition hover:text-cyan-700">
              {footer("helpCenter")}
            </Link>
            <Link href="/faq" className="transition hover:text-cyan-700">
              FAQ
            </Link>
            <Link href="/contact" className="transition hover:text-cyan-700">
              {footer("contactSupport")}
            </Link>
            <Link href="/terms" className="transition hover:text-cyan-700">
              {footer("terms")}
            </Link>
            <Link href="/privacy" className="transition hover:text-cyan-700">
              {footer("privacy")}
            </Link>
            <Link href="/rules" className="transition hover:text-cyan-700">
              {footer("rules")}
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-cyan-100 bg-white/60">
        <div className="flex flex-col gap-2 px-4 py-2 pb-[calc(4.6rem+env(safe-area-inset-bottom))] text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 md:px-8 md:py-4 md:pb-4 md:text-sm">
          <span>© {new Date().getFullYear()} {displaySiteName}</span>
        </div>
      </div>
      </div>
    </footer>
  );
}
