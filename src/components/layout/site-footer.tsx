"use client";

import { Instagram, MessageCircle, Music2 } from "lucide-react";

import { Link } from "@/i18n/navigation";

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

export function SiteFooter({
  siteName = "alisveris.az",
  description = "Azərbaycanda mağazaların yeni məhsullarını bir yerdə toplayan e-ticarət marketplace platforması.",
  socialLinks,
}: SiteFooterProps) {
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
      icon: Music2,
    },
    {
      key: "whatsapp" as const,
      label: "WhatsApp",
      href: normalizeSocialHref("whatsapp", socialLinks?.whatsapp),
      icon: MessageCircle,
    },
  ].filter((item) => item.href);

  return (
    <footer className="border-t bg-card/95">
      <div className="container grid gap-8 py-10 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="grid size-11 place-items-center rounded-lg bg-primary text-lg font-black text-primary-foreground">
              a
            </span>
            <span className="text-xl font-black tracking-normal">{siteName}</span>
          </Link>
          <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
            {description}
          </p>
          {socials.length > 0 ? (
            <div className="mt-5 flex items-center gap-3">
              {socials.map((item) => {
                const Icon = item.icon;

                return (
                  <a
                    key={item.key}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex size-12 items-center justify-center rounded-lg border bg-background text-muted-foreground transition hover:border-primary hover:bg-primary hover:text-primary-foreground"
                    aria-label={item.label}
                  >
                    <Icon className="size-6" aria-hidden="true" />
                  </a>
                );
              })}
            </div>
          ) : null}
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-normal text-foreground">
            Platforma
          </h2>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            <Link href="/products" className="hover:text-primary">
              Mağazalar
            </Link>
            <Link href="/products" className="hover:text-primary">
              Məhsullar
            </Link>
            <Link href="/register" className="hover:text-primary">
              Mağaza aç
            </Link>
          </div>
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-normal text-foreground">
            Hesab
          </h2>
          <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
            <Link href="/admin" className="hover:text-primary">
              Daxil ol
            </Link>
            <Link href="/register" className="hover:text-primary">
              Qeydiyyatdan keç
            </Link>
            <Link href="/cart" className="hover:text-primary">
              Səbət
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t">
        <div className="container flex flex-col gap-2 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} {siteName}</span>
          <span>Yeni məhsullar üçün e-ticarət marketplace</span>
        </div>
      </div>
    </footer>
  );
}
