"use client";
import { useMarketplaceText } from "@/i18n/marketplace-copy";
import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  Headphones,
  Leaf,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { MarketplaceBrand } from "@/components/layout/marketplace-brand";
import {
  InstagramBrandIcon,
  TikTokIcon,
  WhatsAppIcon,
} from "@/components/icons/social-icons";
import { useClientAuthProfileState } from "@/lib/auth/use-client-auth-profile";
import { Link } from "@/i18n/navigation";
type SiteFooterProps = {
  siteName?: string;
  logoUrl?: string;
  darkLogoUrl?: string;
  description?: string;
  socialLinks?: { instagram?: string; tiktok?: string; whatsapp?: string };
};
function socialHref(kind: string, value?: string) {
  if (!value?.trim()) return "";
  const text = value.trim();
  if (/^https?:\/\//i.test(text)) return text;
  return kind === "whatsapp"
    ? `https://wa.me/${text.replace(/\D/g, "")}`
    : kind === "instagram"
      ? `https://instagram.com/${text.replace(/^@/, "")}`
      : `https://tiktok.com/@${text.replace(/^@/, "")}`;
}
export function SiteFooter({
  siteName = "alışveriş",
  logoUrl,
  socialLinks,
}: SiteFooterProps) {
  const text = useMarketplaceText();
  const { profile } = useClientAuthProfileState();
  const role = profile.status === "authenticated" ? profile.role : null;
  const accountHref =
    role === "seller"
      ? "/store/dashboard"
      : role === "admin"
        ? "/radmin"
        : "/dashboard";
  const socials = [
    {
      label: "Instagram",
      href: socialHref("instagram", socialLinks?.instagram),
      Icon: InstagramBrandIcon,
    },
    {
      label: "TikTok",
      href: socialHref("tiktok", socialLinks?.tiktok),
      Icon: TikTokIcon,
    },
    {
      label: "WhatsApp",
      href: socialHref("whatsapp", socialLinks?.whatsapp),
      Icon: WhatsAppIcon,
    },
  ].filter((s) => s.href);
  const groups = [
    {
      title: text("Kəşf edin"),
      links: [
        [text("Bütün məhsullar"), "/products"],
        [text("Mağazalar"), "/stores"],
        [text("Endirimlər"), "/products?discount=true"],
        [text("İcarə məhsulları"), "/products?commerceType=rental"],
      ],
    },
    {
      title: text("Alıcılar üçün"),
      links: [
        [text("Sifarişlərim"), "/dashboard/orders"],
        [text("Şəxsi kabinet"), accountHref],
        [text("Sevimlilər"), "/favorites"],
        [text("Yardım mərkəzi"), "/help"],
      ],
    },
    {
      title: text("Satıcılar üçün"),
      links: [
        [text("Satıcı olun"), "/register?role=seller"],
        [text("Satıcı paneli"), "/store/dashboard"],
        [text("VIP xidmətləri"), "/store/dashboard/promotions"],
        [text("Əməkdaşlıq"), "/contact"],
      ],
    },
  ];
  return (
    <>
      <section className="live-discovery-band">
        <div className="live-wrap">
          <span className="live-discovery-icon">
            <Leaf size={29} />
          </span>
          <div>
            <h2>{text("Yeni tapıntınız bir klik uzaqda.")}</h2>
            <p>
              {text("Mağazaların məhsullarını və yeni təkliflərini kəşf edin.")}
            </p>
          </div>
          <Link href="/products" className="live-btn">
            {text("Kəşf etməyə davam et")}
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
      <footer className="live-footer">
        <div className="live-wrap">
          <div className="live-footer-grid">
            <div className="live-footer-brand">
              <MarketplaceBrand siteName={siteName} logoUrl={logoUrl} />
              <p>
                {text("Sevdiyiniz məhsullar, etibarlı mağazalar.")}
                <br />
                {text("Azərbaycanın alış-veriş məkanı.")}
              </p>
              <div className="live-socials">
                {socials.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon className="size-4" />
                  </a>
                ))}
              </div>
            </div>
            {groups.map((g) => (
              <div className="live-footer-links" key={g.title}>
                <h2>{g.title}</h2>
                {g.links.map(([label, href]) => (
                  <Link key={href} href={href}>
                    {label}
                  </Link>
                ))}
              </div>
            ))}
            <div className="live-footer-contact">
              <h2>{text("Bizimlə əlaqə")}</h2>
              <Link href="/contact">
                <Headphones size={18} />
                {text("Dəstək mərkəzi")}
                <ArrowUpRight size={14} />
              </Link>
              <p>
                <ShieldCheck size={15} />
                {text("Hər alış-verişdə yanınızdayıq")}
              </p>
              <span>{text("🇦🇿 Azərbaycanda, sizin üçün.")}</span>
            </div>
          </div>
          <div className="live-footer-bottom">
            <span>
              © {new Date().getFullYear()}{" "}
              {text("ALISVERIS.AZ. Bütün hüquqlar qorunur.")}
            </span>
            <div>
              <Link href="/terms">{text("İstifadəçi razılaşması")}</Link>
              <Link href="/privacy">{text("Məxfilik siyasəti")}</Link>
              <span>AZN ₼</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
